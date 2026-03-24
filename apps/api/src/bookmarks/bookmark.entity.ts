import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('bookmarks')
@Unique(['user', 'content_id'])
export class Bookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (u) => u.bookmarks, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  content_id: string;

  @CreateDateColumn()
  created_at: Date;
}
