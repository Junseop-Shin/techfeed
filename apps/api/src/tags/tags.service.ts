import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';

const INITIAL_TAGS = [
  { name: 'frontend', sort_order: 1 },
  { name: 'backend', sort_order: 2 },
  { name: 'fullstack', sort_order: 3 },
  { name: 'mobile', sort_order: 4 },
  { name: 'devops', sort_order: 5 },
  { name: 'react', sort_order: 6 },
  { name: 'typescript', sort_order: 7 },
  { name: 'nextjs', sort_order: 8 },
  { name: 'javascript', sort_order: 9 },
  { name: 'python', sort_order: 10 },
  { name: 'java', sort_order: 11 },
  { name: 'kotlin', sort_order: 12 },
  { name: 'golang', sort_order: 13 },
  { name: 'rust', sort_order: 14 },
  { name: 'swift', sort_order: 15 },
  { name: 'aws', sort_order: 16 },
  { name: 'kubernetes', sort_order: 17 },
  { name: 'docker', sort_order: 18 },
  { name: 'ai', sort_order: 19 },
  { name: 'database', sort_order: 20 },
  { name: 'msa', sort_order: 21 },
];

@Injectable()
export class TagsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const tag of INITIAL_TAGS) {
      await this.tagRepo
        .createQueryBuilder()
        .insert()
        .into(Tag)
        .values(tag)
        .orIgnore()
        .execute();
    }
  }

  async findAll(): Promise<string[]> {
    const tags = await this.tagRepo.find({ order: { sort_order: 'ASC', name: 'ASC' } });
    return tags.map((t) => t.name);
  }
}
