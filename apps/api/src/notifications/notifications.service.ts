import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
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
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly pushService: PushService,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:3103');
    // subscriber requires a dedicated connection (cannot run commands in subscribe mode)
    this.subscriber = new Redis(redisUrl);

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

  private async handleNewContent(message: string): Promise<void> {
    let event: NewContentEvent;
    try {
      event = JSON.parse(message) as NewContentEvent;
    } catch {
      this.logger.error('Failed to parse new_content message', message);
      return;
    }

    const { contentId, title, tags } = event;
    const recipientMap = new Map<string, string>(); // userId -> fcm_token

    for (const tag of tags) {
      const users = await this.usersService.findByTag(tag);
      for (const user of users) {
        if (user.fcm_token && !recipientMap.has(user.id)) {
          recipientMap.set(user.id, user.fcm_token);
        }
      }
    }

    const tokens = Array.from(recipientMap.values());
    if (tokens.length === 0) return;

    await this.pushService.sendMulticast(
      tokens,
      '새 글이 올라왔어요',
      title,
      { contentId },
    );

    this.logger.log(`Push sent to ${tokens.length} users for content ${contentId}`);
  }
}
