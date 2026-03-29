import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('user_sources')
@Unique(['user_id', 'source_id'])
export class UserSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column()
  source_id: string;

  @Column()
  source_type: string;

  @CreateDateColumn()
  created_at: Date;
}
