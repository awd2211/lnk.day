import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

@Entity('user_notifications')
@Index('IDX_user_notifications_user_created', ['userId', 'createdAt'])
@Index('IDX_user_notifications_user_read', ['userId', 'read'])
export class UserNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ nullable: true })
  teamId?: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ type: 'varchar', length: 20, default: 'info' })
  type: NotificationType;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true })
  link?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  category?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
