import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisProvider } from '../cache/redis.provider';
import { UsersService } from '../users/users.service';
import { PushService } from '../push/push.service';

interface NewContentEvent {
  contentId: string;
  title: string;
  tags: string[];
  source_type?: 'blog' | 'youtube' | 'job';
}

interface UserBatch {
  blog: number;
  youtube: number;
  job: number;
  token: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private subscriber: Redis;
  private readonly batches = new Map<string, UserBatch>();

  constructor(
    private readonly redisProvider: RedisProvider,
    private readonly usersService: UsersService,
    private readonly pushService: PushService,
  ) {}

  onModuleInit() {
    this.subscriber = this.redisProvider.client.duplicate();

    this.subscriber.subscribe('new_content', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to new_content channel', err);
      } else {
        this.logger.log('Subscribed to Redis channel: new_content');
      }
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === 'new_content') {
        this.handleNewContent(message).catch((err) =>
          this.logger.error('Error handling new_content event', err),
        );
      }
    });
  }

  onModuleDestroy() {
    this.batches.clear();
    this.subscriber.disconnect();
  }

  // Redis key for per-user badge count
  private badgeKey(userId: string): string {
    return `badge:${userId}`;
  }

  async incrementBadge(userId: string): Promise<number> {
    return this.redisProvider.client.incr(this.badgeKey(userId));
  }

  async getBadge(userId: string): Promise<number> {
    const val = await this.redisProvider.client.get(this.badgeKey(userId));
    return val ? parseInt(val, 10) : 0;
  }

  async resetBadge(userId: string): Promise<void> {
    await this.redisProvider.client.set(this.badgeKey(userId), 0);
  }

  private async handleNewContent(message: string): Promise<void> {
    let event: NewContentEvent;
    try {
      event = JSON.parse(message) as NewContentEvent;
    } catch {
      this.logger.error('Failed to parse new_content message', message);
      return;
    }

    const { contentId, tags, source_type } = event;
    this.logger.log(`handleNewContent: contentId=${contentId} source_type=${source_type ?? 'unknown'} tags=${tags.join(',')}`);

    // Collect unique users subscribed to matching tags
    const recipientMap = new Map<string, string>(); // userId -> fcm_token
    for (const tag of tags) {
      const users = await this.usersService.findByTag(tag);
      for (const user of users) {
        if (user.fcm_token && !recipientMap.has(user.id)) {
          recipientMap.set(user.id, user.fcm_token);
        }
      }
    }

    if (recipientMap.size === 0) return;

    this.logger.log(`handleNewContent: queuing for ${recipientMap.size} recipients, source_type=${source_type ?? 'unknown'}`);

    for (const [userId, token] of recipientMap) {
      this.addToBatch(userId, token, source_type ?? 'blog');
    }
  }

  private addToBatch(userId: string, token: string, source_type: 'blog' | 'youtube' | 'job'): void {
    const existing = this.batches.get(userId);

    if (existing) {
      existing[source_type]++;
      existing.token = token; // update in case token changed
    } else {
      this.batches.set(userId, {
        blog: source_type === 'blog' ? 1 : 0,
        youtube: source_type === 'youtube' ? 1 : 0,
        job: source_type === 'job' ? 1 : 0,
        token,
      });
    }
  }

  // 스케줄러에서 하루 4회 호출 (08:30, 12:00, 18:00, 21:00)
  async flushAllBatches(): Promise<void> {
    if (this.batches.size === 0) return;

    this.logger.log(`Flushing ${this.batches.size} pending notification batches`);
    const entries = [...this.batches.entries()];
    this.batches.clear();

    await Promise.allSettled(entries.map(([userId, batch]) => this.flushBatch(userId, batch)));
  }

  private buildBatchMessage(batch: UserBatch): string {
    const parts: string[] = [];
    if (batch.blog > 0) parts.push(`새 블로그 ${batch.blog}개`);
    if (batch.youtube > 0) parts.push(`유튜브 ${batch.youtube}개`);
    if (batch.job > 0) parts.push(`채용공고 ${batch.job}개`);

    if (parts.length === 0) return '';
    return `${parts.join(', ')}가 있습니다. 확인해보세요!`;
  }

  private async flushBatch(userId: string, batch: UserBatch): Promise<void> {
    this.batches.delete(userId);

    const body = this.buildBatchMessage(batch);
    if (!body) return;

    try {
      const badge = await this.incrementBadge(userId);
      await this.pushService.send(batch.token, '새 콘텐츠 도착', body, undefined, badge);
      this.logger.log(`Batch push sent to user ${userId}: ${body}`);
    } catch (err) {
      this.logger.warn(`Batch push failed for user ${userId}: ${err}`);
    }
  }
}
