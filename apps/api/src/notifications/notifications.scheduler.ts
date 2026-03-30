import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisProvider } from '../cache/redis.provider';
import { Content, ContentDocument } from '../contents/content.schema';
import { UsersService } from '../users/users.service';
import { PushService } from '../push/push.service';
import { BookmarksService } from '../bookmarks/bookmarks.service';
import { NotificationsService } from './notifications.service';

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
    private readonly bookmarksService: BookmarksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // 새 콘텐츠 푸시 — 하루 4회: 08:30, 12:00, 18:00, 21:00
  @Cron('30 8 * * *')
  async sendNewContentBatch0830(): Promise<void> {
    await this.notificationsService.flushAllBatches();
  }

  @Cron('0 12 * * *')
  async sendNewContentBatch1200(): Promise<void> {
    await this.notificationsService.flushAllBatches();
  }

  @Cron('0 18 * * *')
  async sendNewContentBatch1800(): Promise<void> {
    await this.notificationsService.flushAllBatches();
  }

  @Cron('0 21 * * *')
  async sendNewContentBatch2100(): Promise<void> {
    await this.notificationsService.flushAllBatches();
  }

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
      const tokens = users.map((u) => u.fcm_token).filter((t): t is string => t !== null);

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

  // Every day at 09:00
  @Cron('0 9 * * *')
  async sendJobDeadlineAlerts(): Promise<void> {
    this.logger.log('Running job deadline alert push notification');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const d1 = new Date(today);
      d1.setDate(today.getDate() + 1);

      const d3 = new Date(today);
      d3.setDate(today.getDate() + 3);

      // PostgreSQL bookmarks: content_type='job', status NOT IN ('탈락','최종합격')
      const bookmarks = await this.bookmarksService.findJobBookmarksForAlert();

      if (bookmarks.length === 0) {
        this.logger.log('No active job bookmarks — skipping deadline alerts');
        return;
      }

      // Collect unique content_ids
      const contentIds = [...new Set(bookmarks.map((b) => b.content_id))];

      // MongoDB: fetch contents with deadline
      const contents = await this.contentModel
        .find({
          _id: { $in: contentIds },
          deadline: { $exists: true, $ne: null },
        })
        .select('_id title deadline company_name position')
        .lean();

      if (contents.length === 0) {
        this.logger.log('No job contents with deadline — skipping');
        return;
      }

      // Group bookmarks by content_id for quick lookup of users
      const bookmarksByContentId = new Map<string, string[]>();
      for (const b of bookmarks) {
        const existing = bookmarksByContentId.get(b.content_id) ?? [];
        existing.push(b.userId);
        bookmarksByContentId.set(b.content_id, existing);
      }

      for (const content of contents) {
        const deadline = new Date(content.deadline as Date);
        deadline.setHours(0, 0, 0, 0);

        const diffMs = deadline.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays !== 1 && diffDays !== 3) continue;

        const contentIdStr = String(content._id);
        const userIds = bookmarksByContentId.get(contentIdStr) ?? [];
        if (userIds.length === 0) continue;

        const companyName = (content.company_name as string | undefined) ?? '채용공고';
        const position = (content.position as string | undefined) ?? content.title;
        const pushTitle = `[${companyName}] 지원 마감 D-${diffDays}`;
        const pushBody = `${position} 마감 D-${diffDays}일 남았습니다`;

        for (const userId of userIds) {
          const user = await this.usersService.findById(userId);
          if (!user?.fcm_token) continue;

          await this.pushService.send(user.fcm_token, pushTitle, pushBody, {
            contentId: contentIdStr,
          });
        }

        this.logger.log(`Job deadline alert sent for content ${contentIdStr} (D-${diffDays})`);
      }
    } catch (err) {
      this.logger.error('Failed to send job deadline alerts', err);
    }
  }
}
