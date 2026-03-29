import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('likes')
@Unique(['user_id', 'content_id'])
export class Like {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('uuid')
  user_id: string;

  @Column()
  content_id: string;

  @CreateDateColumn()
  created_at: Date;
}
