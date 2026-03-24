import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('subscriptions')
@Unique(['user', 'tag'])
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (u) => u.subscriptions, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  tag: string;
}
