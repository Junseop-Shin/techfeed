import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
  ) {}

  async findByUserId(userId: string): Promise<Subscription[]> {
    return this.repo.find({ where: { user: { id: userId } } });
  }
}
