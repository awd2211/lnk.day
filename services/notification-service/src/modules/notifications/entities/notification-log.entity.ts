import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationTemplate } from './notification-template.entity';

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  OPENED = 'opened',
}

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 255 })
  recipient: string;

  @Column({ length: 255, nullable: true })
  subject: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ nullable: true })
  templateId: string;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: NotificationTemplate;

  @Column({ length: 100, nullable: true })
  templateName: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  openedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
