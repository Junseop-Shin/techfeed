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
    const existing = await this.repo.findOne({
      where: { user: { id: userId }, content_id: contentId },
    });
    if (existing) return;

    const bookmark = this.repo.create({
      user: { id: userId },
      content_id: contentId,
    });
    await this.repo.save(bookmark);
  }

  async remove(userId: string, contentId: string): Promise<void> {
    await this.repo.delete({ user: { id: userId }, content_id: contentId });
  }
}
