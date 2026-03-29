import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisProvider } from '../cache/redis.provider';
import { UsersService } from '../users/users.service';
import { PushService } from '../push/push.service';

interface NewContentEvent {
  contentId: string;
  title: string;
  tags: string[];
}

@Injectable()
export class NotificationsService implements OnModuleInit {
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

    const { contentId, title, tags } = event;

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

    // Send individually so each user gets their own badge count
    let successCount = 0;
    for (const [userId, token] of recipientMap) {
      try {
        const badge = await this.incrementBadge(userId);
        await this.pushService.sendBadgeOnly(token, badge, { contentId });
        successCount++;
      } catch (err) {
        this.logger.warn(`Push failed for user ${userId}: ${err}`);
      }
    }

    this.logger.log(`Push sent to ${successCount} users for content ${contentId}`);
  }
}
