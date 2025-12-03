import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_security_settings')
export class UserSecuritySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('uuid')
  userId: string;

  // 登录通知设置
  @Column({ default: true })
  loginNotifications: boolean;

  // 可疑活动警报
  @Column({ default: true })
  suspiciousActivityAlerts: boolean;

  // 会话超时（天数）: 1, 7, 30, 0(永不过期)
  @Column({ default: 7 })
  sessionTimeoutDays: number;

  // IP 白名单启用
  @Column({ default: false })
  ipWhitelistEnabled: boolean;

  // IP 白名单列表 (JSON 数组)
  @Column('simple-array', { nullable: true })
  ipWhitelist: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
