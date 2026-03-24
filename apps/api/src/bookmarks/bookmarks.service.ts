import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from './bookmark.entity';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly repo: Repository<Bookmark>,
  ) {}

  async findByUserId(userId: string): Promise<Bookmark[]> {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
    });
  }

  async add(userId: string, contentId: string): Promise<void> {
    try {
      const bookmark = this.repo.create({ user: { id: userId }, content_id: contentId });
      await this.repo.save(bookmark);
    } catch (e: any) {
      // unique violation (23505) — already exists, treat as success
      if (e?.code === '23505') return;
      throw e;
    }
  }

  async remove(userId: string, contentId: string): Promise<void> {
    await this.repo.delete({ user: { id: userId }, content_id: contentId });
  }
}
