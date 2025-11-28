import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum ConsentType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
  MARKETING_EMAILS = 'marketing_emails',
  ANALYTICS_TRACKING = 'analytics_tracking',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  COOKIE_ESSENTIAL = 'cookie_essential',
  COOKIE_ANALYTICS = 'cookie_analytics',
  COOKIE_MARKETING = 'cookie_marketing',
}

@Entity('user_consents')
@Index(['userId', 'type'], { unique: true })
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: ConsentType })
  type: ConsentType;

  @Column({ default: false })
  granted: boolean;

  // 同意的版本（用于追踪政策更新）
  @Column({ nullable: true })
  version: string;

  // IP 地址（用于审计）
  @Column({ nullable: true })
  ipAddress: string;

  // 用户代理
  @Column({ nullable: true })
  userAgent: string;

  // 同意/撤销时间
  @Column({ type: 'timestamp with time zone', nullable: true })
  grantedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  revokedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
