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

  async create(email: string, hashedPassword: string, name?: string): Promise<User> {
    const user = this.userRepo.create({ email, password: hashedPassword, name });
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

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { google_id: googleId } });
  }

  async findOrCreateGoogleUser(
    googleId: string,
    email: string,
    name: string,
  ): Promise<User> {
    const existing = await this.findByGoogleId(googleId);
    if (existing) return existing;

    // email 중복 시 기존 계정에 google_id 연결
    const byEmail = await this.findByEmail(email);
    if (byEmail) {
      await this.userRepo.update(byEmail.id, { google_id: googleId, name: byEmail.name ?? name });
      return this.userRepo.findOne({ where: { id: byEmail.id } }) as Promise<User>;
    }

    const user = this.userRepo.create({ email, name, google_id: googleId });
    return this.userRepo.save(user);
  }

  async removeFcmToken(userId: string): Promise<void> {
    await this.userRepo.update(userId, { fcm_token: null });
  }
}
