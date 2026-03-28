import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subscription_tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: 0 })
  sort_order: number;
}
