import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @Column({ type: 'jsonb', default: {} })
  email: {
    enabled: boolean;
    linkCreated?: boolean;
    milestone?: boolean;
    weeklyReport?: boolean;
    securityAlerts?: boolean;
  };

  @Column({ type: 'jsonb', default: {} })
  push: {
    enabled: boolean;
    linkCreated?: boolean;
    milestone?: boolean;
    weeklyReport?: boolean;
    securityAlerts?: boolean;
  };

  @Column({ type: 'jsonb', default: {} })
  inApp: {
    enabled: boolean;
    linkCreated?: boolean;
    milestone?: boolean;
    weeklyReport?: boolean;
    securityAlerts?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
