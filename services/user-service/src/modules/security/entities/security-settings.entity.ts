import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('security_settings')
export class SecuritySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ========== 密码策略 ==========
  @Column({ default: 8 })
  minPasswordLength: number;

  @Column({ default: true })
  requireUppercase: boolean;

  @Column({ default: true })
  requireLowercase: boolean;

  @Column({ default: true })
  requireNumbers: boolean;

  @Column({ default: false })
  requireSpecialChars: boolean;

  @Column({ default: 0 })
  passwordExpiryDays: number; // 0 表示不过期

  @Column({ default: 0 })
  preventPasswordReuse: number; // 防止重复使用最近 N 个密码，0 表示不限制

  // ========== 登录安全 ==========
  @Column({ default: 5 })
  maxLoginAttempts: number;

  @Column({ default: 30 })
  lockoutDuration: number; // 分钟

  @Column({ default: 480 })
  sessionTimeout: number; // 分钟，默认 8 小时

  @Column({ default: false })
  requireMfa: boolean; // 强制所有用户启用 MFA

  // ========== IP 限制 ==========
  @Column({ default: false })
  ipWhitelistEnabled: boolean;

  @Column({ default: true })
  ipBlacklistEnabled: boolean;

  @Column({ default: 100 })
  rateLimit: number; // 每分钟请求限制

  // ========== 其他设置 ==========
  @Column({ default: 90 })
  auditLogRetentionDays: number;

  @Column({ default: true })
  sensitiveDataMasking: boolean;

  @Column({ default: true })
  forceHttps: boolean;

  // ========== 元数据 ==========
  @Column('uuid', { nullable: true })
  updatedById: string | null; // 最后修改的管理员 ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
