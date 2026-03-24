import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisProvider } from '../cache/redis.provider';
import { Content, ContentDocument } from '../contents/content.schema';
import { UsersService } from '../users/users.service';
import { PushService } from '../push/push.service';

const TRENDING_KEY = 'rank:contents';
const TOP_N = 3;

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly redisProvider: RedisProvider,
    @InjectModel(Content.name)
    private readonly contentModel: Model<ContentDocument>,
    private readonly usersService: UsersService,
    private readonly pushService: PushService,
  ) {}

  // Every Monday at 09:00
  @Cron('0 9 * * 1')
  async sendWeeklyTrends(): Promise<void> {
    this.logger.log('Running weekly trend push notification');

    try {
      const topIds = await this.redisProvider.client.zrevrange(TRENDING_KEY, 0, TOP_N - 1);
      if (topIds.length === 0) {
        this.logger.log('No trending content found — skipping weekly push');
        return;
      }

      const contents = await this.contentModel
        .find({ _id: { $in: topIds } })
        .select('title')
        .lean();

      const titles = contents.map((c) => c.title).join(', ');
      const body = `이번 주 트렌드: ${titles}`;

      const users = await this.usersService.findAllWithFcmToken();
      const tokens = users.map((u) => u.fcm_token).filter(Boolean);

      if (tokens.length === 0) {
        this.logger.log('No users with FCM tokens — skipping weekly push');
        return;
      }

      await this.pushService.sendMulticast(tokens, '이번 주 인기 글 모아보기', body);
      this.logger.log(`Weekly trend push sent to ${tokens.length} users`);
    } catch (err) {
      this.logger.error('Failed to send weekly trend push', err);
    }
  }
}
