import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';
import { Subscription } from '../subscriptions/subscription.entity';

interface TagDistributionItem {
  tag: string;
  count: number;
  percentage: number;
}

interface UserStats {
  week_reads: number;
  total_reads: number;
  tag_distribution: TagDistributionItem[];
  streak_days: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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

  async getStats(userId: string): Promise<UserStats> {
    // week_reads: 최근 7일
    const weekReadsResult = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count
       FROM user_events
       WHERE user_id = $1
         AND event_type = 'read'
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId],
    );
    const week_reads = parseInt(weekReadsResult[0]?.count ?? '0', 10);

    // total_reads: 전체
    const totalReadsResult = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count
       FROM user_events
       WHERE user_id = $1
         AND event_type = 'read'`,
      [userId],
    );
    const total_reads = parseInt(totalReadsResult[0]?.count ?? '0', 10);

    // tag_distribution: 최근 30일 상위 8개
    const tagRows = await this.dataSource.query<{ tag: string; count: string }[]>(
      `SELECT tag, COUNT(*) AS count
       FROM user_events
       WHERE user_id = $1
         AND event_type = 'read'
         AND created_at >= NOW() - INTERVAL '30 days'
         AND tag IS NOT NULL
       GROUP BY tag
       ORDER BY count DESC
       LIMIT 8`,
      [userId],
    );
    const tagTotal = tagRows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const tag_distribution: TagDistributionItem[] = tagRows.map((r) => {
      const count = parseInt(r.count, 10);
      return {
        tag: r.tag,
        count,
        percentage: tagTotal > 0 ? Math.round((count / tagTotal) * 100) : 0,
      };
    });

    // streak_days: 오늘부터 역산하여 연속 read 일수
    const streakRows = await this.dataSource.query<{ day: string }[]>(
      `SELECT DISTINCT DATE(created_at) AS day
       FROM user_events
       WHERE user_id = $1
         AND event_type = 'read'
       ORDER BY day DESC`,
      [userId],
    );

    let streak_days = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < streakRows.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const actual = new Date(streakRows[i].day);
      actual.setHours(0, 0, 0, 0);

      if (expected.getTime() === actual.getTime()) {
        streak_days++;
      } else {
        break;
      }
    }

    return { week_reads, total_reads, tag_distribution, streak_days };
  }
}
