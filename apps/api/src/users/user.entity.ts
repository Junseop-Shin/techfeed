import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Subscription } from '../subscriptions/subscription.entity';
import { Bookmark } from '../bookmarks/bookmark.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  fcm_token: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Subscription, (s) => s.user)
  subscriptions: Subscription[];

  @OneToMany(() => Bookmark, (b) => b.user)
  bookmarks: Bookmark[];
}
