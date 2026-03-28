import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly repo: Repository<Comment>,
  ) {}

  async create(userId: string, contentId: string, body: string): Promise<Comment> {
    const comment = this.repo.create({
      user: { id: userId },
      content_id: contentId,
      body,
    });
    return this.repo.save(comment);
  }

  async findByContentId(contentId: string): Promise<Comment[]> {
    return this.repo.find({
      where: { content_id: contentId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async delete(userId: string, commentId: number): Promise<void> {
    const comment = await this.repo.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.repo.delete(commentId);
  }
}
