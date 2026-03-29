import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSource } from './user-source.entity';

@Injectable()
export class UserSourcesService {
  constructor(
    @InjectRepository(UserSource)
    private readonly repo: Repository<UserSource>,
  ) {}

  getByUser(userId: string): Promise<UserSource[]> {
    return this.repo.find({ where: { user_id: userId } });
  }

  async follow(userId: string, sourceId: string, sourceType: string): Promise<void> {
    await this.repo.upsert(
      { user_id: userId, source_id: sourceId, source_type: sourceType },
      ['user_id', 'source_id'],
    );
  }

  async unfollow(userId: string, sourceId: string): Promise<void> {
    await this.repo.delete({ user_id: userId, source_id: sourceId });
  }
}
