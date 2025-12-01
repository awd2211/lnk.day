import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NotificationTemplateType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
}

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: NotificationTemplateType,
    default: NotificationTemplateType.EMAIL,
  })
  type: NotificationTemplateType;

  @Column({ length: 255, nullable: true })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  htmlContent: string;

  @Column({ type: 'jsonb', default: [] })
  variables: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 50, nullable: true })
  category: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
