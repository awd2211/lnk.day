import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ChannelType {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
}

@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ChannelType,
    default: ChannelType.EMAIL,
  })
  type: ChannelType;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ default: false })
  enabled: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  lastTestedAt: Date;

  @Column({ nullable: true, length: 20 })
  lastTestStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
