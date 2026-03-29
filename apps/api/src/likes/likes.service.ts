import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { Like } from './like.entity';
import { Content, ContentDocument } from '../contents/content.schema';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    @InjectModel(Content.name)
    private readonly contentModel: Model<ContentDocument>,
  ) {}

  async toggle(userId: string, contentId: string): Promise<{ liked: boolean; like_count: number }> {
    const existing = await this.likeRepo.findOne({ where: { user_id: userId, content_id: contentId } });
    if (existing) {
      await this.likeRepo.delete({ user_id: userId, content_id: contentId });
      const updated = await this.contentModel.findByIdAndUpdate(
        contentId,
        { $inc: { like_count: -1 } },
        { new: true },
      ).lean();
      return { liked: false, like_count: Math.max(0, updated?.like_count ?? 0) };
    } else {
      const like = this.likeRepo.create({ user_id: userId, content_id: contentId });
      await this.likeRepo.save(like);
      const updated = await this.contentModel.findByIdAndUpdate(
        contentId,
        { $inc: { like_count: 1 } },
        { new: true },
      ).lean();
      return { liked: true, like_count: updated?.like_count ?? 1 };
    }
  }

  async isLiked(userId: string, contentId: string): Promise<boolean> {
    const like = await this.likeRepo.findOne({ where: { user_id: userId, content_id: contentId } });
    return !!like;
  }

  async getLikedContentIds(userId: string, contentIds: string[]): Promise<Set<string>> {
    if (contentIds.length === 0) return new Set();
    const likes = await this.likeRepo
      .createQueryBuilder('like')
      .where('like.user_id = :userId', { userId })
      .andWhere('like.content_id IN (:...ids)', { ids: contentIds })
      .getMany();
    return new Set(likes.map((l) => l.content_id));
  }

  async getLikeCounts(contentIds: string[]): Promise<Record<string, number>> {
    if (contentIds.length === 0) return {};
    const rows = await this.likeRepo
      .createQueryBuilder('like')
      .select('like.content_id', 'content_id')
      .addSelect('COUNT(*)', 'count')
      .where('like.content_id IN (:...ids)', { ids: contentIds })
      .groupBy('like.content_id')
      .getRawMany<{ content_id: string; count: string }>();
    return Object.fromEntries(rows.map((r) => [r.content_id, parseInt(r.count, 10)]));
  }
}
