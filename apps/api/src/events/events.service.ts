import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.initHypertable();
    } catch (err) {
      this.logger.error('Failed to initialize TimescaleDB hypertable', err);
      // App continues — hypertable may not be available
    }
  }

  private async initHypertable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_events (
        time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        device_id   VARCHAR(100),
        user_id     UUID,
        event_type  VARCHAR(50),
        content_id  VARCHAR(100),
        tag         VARCHAR(50),
        duration_ms INTEGER,
        metadata    JSONB
      )
    `);

    await this.dataSource.query(`
      SELECT create_hypertable('user_events', 'time', if_not_exists => TRUE)
    `);

    this.logger.log('user_events hypertable initialized');
  }

  private forwardToMonitor(events: CreateEventDto[], userId?: string): void {
    const url = process.env.MONITOR_INGESTOR_URL;
    if (!url) return;

    const payload = events.map((e) => ({
      event_type: e.event_type,
      service_id: 'techfeed',
      user_id: userId ?? null,
      metadata: {
        ...(e.metadata ?? {}),
        content_id: e.content_id,
        tag: e.tag,
        duration_ms: e.duration_ms,
        device_id: e.device_id,
      },
    }));

    fetch(`${url}/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  async saveEvents(events: CreateEventDto[], userId?: string): Promise<void> {
    if (events.length === 0) return;

    this.forwardToMonitor(events, userId);

    const values = events
      .map((_, i) => {
        const base = i * 7;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
      })
      .join(', ');

    const params: unknown[] = [];
    for (const event of events) {
      params.push(
        userId ?? null,
        event.event_type,
        event.content_id ?? null,
        event.tag ?? null,
        event.duration_ms ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.device_id ?? null,
      );
    }

    await this.dataSource.query(
      `INSERT INTO user_events (user_id, event_type, content_id, tag, duration_ms, metadata, device_id)
       VALUES ${values}`,
      params,
    );
  }

  async getTagTrends(): Promise<{ tag: string; count: number }[]> {
    const rows = await this.dataSource.query<{ tag: string; count: string }[]>(`
      SELECT tag, COUNT(*) as count
      FROM user_events
      WHERE time > NOW() - INTERVAL '7 days'
        AND tag IS NOT NULL
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20
    `);
    return rows.map((r) => ({ tag: r.tag, count: parseInt(r.count, 10) }));
  }

  async getHourlyReads(): Promise<{ hour: number; count: number }[]> {
    const rows = await this.dataSource.query<{ hour: string; count: string }[]>(`
      SELECT EXTRACT(HOUR FROM time) as hour, COUNT(*) as count
      FROM user_events
      WHERE event_type = 'read'
        AND time > NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour
    `);
    return rows.map((r) => ({
      hour: parseInt(r.hour, 10),
      count: parseInt(r.count, 10),
    }));
  }

  async getTopContents(): Promise<{ content_id: string; count: number }[]> {
    const rows = await this.dataSource.query<
      { content_id: string; count: string }[]
    >(`
      SELECT content_id, COUNT(*) as count
      FROM user_events
      WHERE event_type = 'click'
        AND time > NOW() - INTERVAL '7 days'
      GROUP BY content_id
      ORDER BY count DESC
      LIMIT 10
    `);
    return rows.map((r) => ({
      content_id: r.content_id,
      count: parseInt(r.count, 10),
    }));
  }

  async getActiveUsersCount(): Promise<number> {
    const rows = await this.dataSource.query<{ count: string }[]>(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM user_events
      WHERE time > NOW() - INTERVAL '1 hour'
        AND user_id IS NOT NULL
    `);
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}

