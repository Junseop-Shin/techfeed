import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from './bookmark.entity';

interface JobBookmarkForAlert {
  content_id: string;
  userId: string;
}

const DEFAULT_STATUS: Record<string, string> = {
  blog: 'to_read',
  youtube: 'to_read',
  job: 'interested',
};

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly repo: Repository<Bookmark>,
  ) {}

  async findByUserId(userId: string, contentType?: string): Promise<Bookmark[]> {
    return this.repo.find({
      where: {
        user: { id: userId },
        ...(contentType ? { content_type: contentType } : {}),
      },
      order: { created_at: 'DESC' },
    });
  }

  async add(userId: string, contentId: string, contentType?: string): Promise<void> {
    const status = contentType ? (DEFAULT_STATUS[contentType] ?? null) : null;
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

  async remove(userId: string, contentId: string): Promise<void> {
    await this.repo.delete({ user: { id: userId }, content_id: contentId });
  }

  async findJobBookmarksForAlert(): Promise<JobBookmarkForAlert[]> {
    // status가 NULL이거나 '탈락'/'최종합격'이 아닌 job 북마크 조회
    const bookmarks = await this.repo
      .createQueryBuilder('bookmark')
      .leftJoinAndSelect('bookmark.user', 'user')
      .where('bookmark.content_type = :type', { type: 'job' })
      .andWhere(
        '(bookmark.status IS NULL OR bookmark.status NOT IN (:...excluded))',
        { excluded: ['탈락', '최종합격'] },
      )
      .getMany();

    return bookmarks.map((b) => ({
      content_id: b.content_id,
      userId: b.user.id,
    }));
  }
}
