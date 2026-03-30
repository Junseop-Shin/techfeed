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

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true, unique: true })
  google_id: string;

  @Column({ type: 'varchar', nullable: true })
  fcm_token: string | null;

  @Column({ type: 'boolean', default: false })
  is_premium: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  agreed_terms_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  reset_token: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reset_token_expires: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Subscription, (s) => s.user)
  subscriptions: Subscription[];

  @OneToMany(() => Bookmark, (b) => b.user)
  bookmarks: Bookmark[];
}
