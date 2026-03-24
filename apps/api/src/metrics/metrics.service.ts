import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Gauge, Registry } from 'prom-client';
import { EventsService } from '../events/events.service';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry: Registry;

  readonly apiRequestsTotal: Counter<string>;
  readonly contentViewsTotal: Counter<string>;
  readonly crawlerRunsTotal: Counter<string>;
  readonly activeUsersGauge: Gauge<string>;

  constructor(private readonly eventsService: EventsService) {
    this.registry = new Registry();

    this.apiRequestsTotal = new Counter({
      name: 'techfeed_api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.contentViewsTotal = new Counter({
      name: 'techfeed_content_views_total',
      help: 'Total number of content views',
      labelNames: ['content_id'],
      registers: [this.registry],
    });

    this.crawlerRunsTotal = new Counter({
      name: 'techfeed_crawler_runs_total',
      help: 'Total number of crawler runs',
      labelNames: ['source_type', 'status'],
      registers: [this.registry],
    });

    this.activeUsersGauge = new Gauge({
      name: 'techfeed_active_users_gauge',
      help: 'Number of active users in the last 1 hour',
      registers: [this.registry],
      collect: async () => {
        try {
          const count = await this.eventsService.getActiveUsersCount();
          this.activeUsersGauge.set(count);
        } catch {
          // Silently fail — gauge will retain previous value
        }
      },
    });
  }

  onModuleInit(): void {
    // Initialize crawler runs counter at 0
    this.crawlerRunsTotal.inc({ source_type: 'blog', status: 'success' }, 0);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
