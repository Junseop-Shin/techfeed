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

const BATCH_KEY_PREFIX = 'notif:batch:';
const BATCH_TTL_SECONDS = 48 * 60 * 60; // 48h

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private subscriber: Redis;

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
    this.subscriber.disconnect();
  }

  private batchKey(userId: string): string {
    return `${BATCH_KEY_PREFIX}${userId}`;
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

    await Promise.all(
      [...recipientMap.entries()].map(([userId, token]) =>
        this.addToBatch(userId, token, source_type ?? 'blog'),
      ),
    );
  }

  private async addToBatch(userId: string, token: string, source_type: 'blog' | 'youtube' | 'job'): Promise<void> {
    const key = this.batchKey(userId);
    await this.redisProvider.client
      .pipeline()
      .hincrby(key, source_type, 1)
      .hset(key, 'token', token)
      .expire(key, BATCH_TTL_SECONDS)
      .exec();
  }

  // 스케줄러에서 하루 4회 호출 (08:30, 12:00, 18:00, 21:00)
  async flushAllBatches(): Promise<void> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, found] = await this.redisProvider.client.scan(
        cursor,
        'MATCH',
        `${BATCH_KEY_PREFIX}*`,
        'COUNT',
        '100',
      );
      cursor = next;
      keys.push(...found);
    } while (cursor !== '0');

    if (keys.length === 0) return;

    this.logger.log(`Flushing ${keys.length} pending notification batches`);
    await Promise.allSettled(
      keys.map((key) => {
        const userId = key.slice(BATCH_KEY_PREFIX.length);
        return this.flushBatch(userId, key);
      }),
    );
  }

  private buildBatchMessage(batch: UserBatch): string {
    const parts: string[] = [];
    if (batch.blog > 0) parts.push(`새 블로그 ${batch.blog}개`);
    if (batch.youtube > 0) parts.push(`유튜브 ${batch.youtube}개`);
    if (batch.job > 0) parts.push(`채용공고 ${batch.job}개`);

    if (parts.length === 0) return '';
    return `${parts.join(', ')}가 있습니다. 확인해보세요!`;
  }

  private async flushBatch(userId: string, redisKey: string): Promise<void> {
    const data = await this.redisProvider.client.hgetall(redisKey);
    if (!data || !data.token) return;

    const batch: UserBatch = {
      blog: parseInt(data.blog ?? '0', 10),
      youtube: parseInt(data.youtube ?? '0', 10),
      job: parseInt(data.job ?? '0', 10),
      token: data.token,
    };

    const body = this.buildBatchMessage(batch);
    if (!body) {
      await this.redisProvider.client.del(redisKey);
      return;
    }

    try {
      const badge = await this.incrementBadge(userId);
      await this.pushService.send(batch.token, '새 콘텐츠 도착', body, undefined, badge);
      await this.redisProvider.client.del(redisKey);
      this.logger.log(`Batch push sent to user ${userId}: ${body}`);
    } catch (err) {
      this.logger.warn(`Batch push failed for user ${userId}: ${err}`);
    }
  }
}
