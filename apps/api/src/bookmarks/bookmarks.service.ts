import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model, Types } from 'mongoose';
import { Bookmark } from './bookmark.entity';
import { Content, ContentDocument } from '../contents/content.schema';

interface JobBookmarkForAlert {
  content_id: string;
  userId: string;
}

const DEFAULT_STATUS: Record<string, string> = {
  blog: 'interested',
  youtube: 'interested',
  job: 'interested',
};

const BOOKMARK_LIMITS: Record<string, number> = {
  blog:    50,
  youtube: 30,
  job:     30,
};
const PREMIUM_EMAILS = new Set(['nuclearbomb6518@gmail.com']);

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly repo: Repository<Bookmark>,
    @InjectModel(Content.name)
    private readonly contentModel: Model<ContentDocument>,
  ) {}

  async findByUserId(userId: string, contentType?: string): Promise<(Bookmark & { content: any })[]> {
    const bookmarks = await this.repo.find({
      where: {
        user: { id: userId },
        ...(contentType ? { content_type: contentType } : {}),
      },
      order: { created_at: 'DESC' },
    });

    if (bookmarks.length === 0) return [];

    // Enrich with content from MongoDB
    const validIds = bookmarks
      .map((b) => b.content_id)
      .filter((id) => Types.ObjectId.isValid(id));

    const contents = await this.contentModel
      .find({ _id: { $in: validIds } })
      .lean()
      .exec();

    const contentMap = new Map(contents.map((c) => [String(c._id), c]));

    return bookmarks.map((b) => {
      const raw = contentMap.get(b.content_id);
      const content = raw
        ? {
            ...raw,
            id: String(raw._id),
            source_type: raw.type,
            thumbnail_url: raw.thumbnail ?? null,
          }
        : null;
      return { ...b, content };
    });
  }

  async add(userId: string, email: string, contentId: string, contentType?: string, statusOverride?: string): Promise<void> {
    if (!PREMIUM_EMAILS.has(email) && contentType) {
      const limit = BOOKMARK_LIMITS[contentType] ?? 30;
      const count = await this.repo.count({
        where: { user: { id: userId }, content_type: contentType },
      });
      if (count >= limit) {
        const typeLabel = contentType === 'blog' ? '블로그' : contentType === 'youtube' ? '영상' : '채용공고';
        throw new ForbiddenException(
          `${typeLabel} 북마크 한도(${limit}개)에 도달했습니다. 프리미엄으로 업그레이드하면 무제한으로 저장할 수 있습니다.`,
        );
      }
    }

    const status = statusOverride ?? (contentType ? (DEFAULT_STATUS[contentType] ?? null) : null);
    try {
      const bookmark = this.repo.create({
        user: { id: userId },
        content_id: contentId,
        content_type: contentType ?? null,
        status,
      });
      await this.repo.save(bookmark);
    } catch (e: any) {
      // unique violation (23505) — already exists, treat as success
      if (e?.code === '23505') return;
      throw e;
    }
  }

  async updateStatus(userId: string, contentId: string, status: string): Promise<void> {
    const bookmark = await this.repo.findOne({
      where: { user: { id: userId }, content_id: contentId },
    });
    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }
    bookmark.status = status;
    await this.repo.save(bookmark);
  }

  async updateJobStatus(userId: string, contentId: string, jobStatus: string): Promise<void> {
    const bookmark = await this.repo.findOne({
      where: { user: { id: userId }, content_id: contentId },
    });
    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }
    bookmark.job_status = jobStatus;
    await this.repo.save(bookmark);
  }

  async remove(userId: string, contentId: string): Promise<void> {
    await this.repo.delete({ user: { id: userId }, content_id: contentId });
  }

  async findJobBookmarksForAlert(): Promise<JobBookmarkForAlert[]> {
    const bookmarks = await this.repo
      .createQueryBuilder('bookmark')
      .leftJoinAndSelect('bookmark.user', 'user')
      .where('bookmark.content_type = :type', { type: 'job' })
      .andWhere(
        '(bookmark.status IS NULL OR bookmark.status IN (:...pending))',
        { pending: ['interested', 'to_apply'] },
      )
      .getMany();

    return bookmarks.map((b) => ({
      content_id: b.content_id,
      userId: b.user.id,
    }));
  }
}
