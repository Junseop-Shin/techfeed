import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

export type SubscriptionType = 'tag' | 'channel' | 'company' | 'subject';

@Entity('subscriptions')
@Unique(['user', 'tag', 'type'])
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (u) => u.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  tag: string;

  @Column({ default: 'tag' })
  type: SubscriptionType;
}
