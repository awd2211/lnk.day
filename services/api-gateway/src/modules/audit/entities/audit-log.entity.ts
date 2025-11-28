import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AuditAction =
  // Link actions
  | 'link.created'
  | 'link.updated'
  | 'link.deleted'
  | 'link.enabled'
  | 'link.disabled'
  // User actions
  | 'user.login'
  | 'user.logout'
  | 'user.password_changed'
  | 'user.email_changed'
  | 'user.created'
  | 'user.deleted'
  // Team actions
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.member_role_changed'
  // API Key actions
  | 'api_key.created'
  | 'api_key.revoked'
  | 'api_key.used'
  // Settings actions
  | 'settings.updated'
  | 'domain.added'
  | 'domain.removed'
  | 'domain.verified'
  // Integration actions
  | 'integration.connected'
  | 'integration.disconnected'
  | 'webhook.created'
  | 'webhook.deleted'
  // Security actions
  | 'security.failed_login'
  | 'security.suspicious_activity'
  | 'security.2fa_enabled'
  | 'security.2fa_disabled';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ nullable: true })
  @Index()
  userId?: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  action: AuditAction;

  @Column({ type: 'varchar', length: 20, default: 'info' })
  severity: AuditSeverity;

  @Column({ nullable: true })
  resourceType?: string; // 'link', 'user', 'team', etc.

  @Column({ nullable: true })
  @Index()
  resourceId?: string;

  @Column('jsonb', { default: {} })
  details: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    changes?: string[];
    reason?: string;
    [key: string]: any;
  };

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  apiKeyId?: string; // If action was via API key

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
