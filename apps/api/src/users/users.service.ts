import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Subscription } from '../subscriptions/subscription.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ['subscriptions'],
    });
  }

  async create(email: string, hashedPassword: string): Promise<User> {
    const user = this.userRepo.create({ email, password: hashedPassword });
    return this.userRepo.save(user);
  }

  async updateTags(userId: string, tags: string[]): Promise<void> {
    await this.subscriptionRepo.delete({ user: { id: userId } });
    if (tags.length === 0) return;

    const subs = tags.map((tag) =>
      this.subscriptionRepo.create({ user: { id: userId }, tag }),
    );
    await this.subscriptionRepo.save(subs);
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepo.update(userId, { fcm_token: fcmToken });
  }

  async findByTag(tag: string): Promise<User[]> {
    const subs = await this.subscriptionRepo.find({
      where: { tag },
      relations: ['user'],
    });
    return subs.map((s) => s.user).filter((u) => u.fcm_token);
  }

  async findAllWithFcmToken(): Promise<User[]> {
    return this.userRepo
      .createQueryBuilder('user')
      .where('user.fcm_token IS NOT NULL')
      .getMany();
  }
}
