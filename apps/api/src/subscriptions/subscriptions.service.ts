import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionType } from './subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
  ) {}

  async findByUserId(userId: string): Promise<Subscription[]> {
    return this.repo.find({ where: { user: { id: userId } } });
  }

  async getByType(userId: string, type: SubscriptionType): Promise<Subscription[]> {
    return this.repo.find({ where: { user: { id: userId }, type } });
  }

  async syncChannels(userId: string, channels: string[]): Promise<void> {
    await this.repo.delete({ user: { id: userId }, type: 'channel' });
    if (channels.length === 0) return;

    const subs = channels.map((channel) =>
      this.repo.create({ user: { id: userId }, tag: channel, type: 'channel' }),
    );
    await this.repo.save(subs);
  }

  async syncSubjects(userId: string, subjects: string[]): Promise<void> {
    await this.repo.delete({ user: { id: userId }, type: 'subject' });
    if (subjects.length === 0) return;

    const subs = subjects.map((subject) =>
      this.repo.create({ user: { id: userId }, tag: subject, type: 'subject' }),
    );
    await this.repo.save(subs);
  }
}
