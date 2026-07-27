import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Content, ContentDocument } from '../contents/content.schema';
import { LikesService } from './likes.service';

@Injectable()
export class LikesScheduler {
  private readonly logger = new Logger(LikesScheduler.name);

  constructor(
    private readonly likesService: LikesService,
    @InjectModel(Content.name)
    private readonly contentModel: Model<ContentDocument>,
  ) {}

  @Cron('0 4 * * *', { timeZone: 'Asia/Seoul' })
  async resyncLikeCounts(): Promise<void> {
    this.logger.log('Running like-count resync job');
    try {
      const counts = await this.likesService.getAllLikeCounts();

      if (counts.size === 0) {
        const result = await this.contentModel.updateMany(
          { like_count: { $gt: 0 } },
          { $set: { like_count: 0 } },
        );
        this.logger.log(`Like-count resync: no likes in PG — reset ${result.modifiedCount} documents to 0`);
        return;
      }

      const bulkOps = [...counts.entries()].map(([contentId, count]) => ({
        updateOne: {
          filter: { _id: contentId },
          update: { $set: { like_count: count } },
        },
      }));

      const bulkResult = await this.contentModel.bulkWrite(bulkOps);

      const likedIds = [...counts.keys()];
      const resetResult = await this.contentModel.updateMany(
        { _id: { $nin: likedIds }, like_count: { $gt: 0 } },
        { $set: { like_count: 0 } },
      );

      this.logger.log(
        `Like-count resync: synced ${bulkResult.modifiedCount} documents, reset ${resetResult.modifiedCount} stale documents`,
      );
    } catch (err) {
      this.logger.error('Like-count resync failed', err);
    }
  }
}
