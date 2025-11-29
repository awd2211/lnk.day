import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  // Admin actions
  ADMIN_LOGIN = 'admin_login',
  ADMIN_LOGOUT = 'admin_logout',
  ADMIN_CREATE = 'admin_create',
  ADMIN_UPDATE = 'admin_update',
  ADMIN_DELETE = 'admin_delete',

  // User management
  USER_VIEW = 'user_view',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  USER_SUSPEND = 'user_suspend',
  USER_ACTIVATE = 'user_activate',
  USER_RESET_PASSWORD = 'user_reset_password',
  USER_FORCE_LOGOUT = 'user_force_logout',

  // Team management
  TEAM_VIEW = 'team_view',
  TEAM_UPDATE = 'team_update',
  TEAM_DELETE = 'team_delete',
  TEAM_SUSPEND = 'team_suspend',
  TEAM_ACTIVATE = 'team_activate',

  // Link management
  LINK_VIEW = 'link_view',
  LINK_DELETE = 'link_delete',
  LINK_BLOCK = 'link_block',
  LINK_UNBLOCK = 'link_unblock',

  // System
  SYSTEM_CONFIG_UPDATE = 'system_config_update',
  SYSTEM_CACHE_CLEAR = 'system_cache_clear',
  SYSTEM_BACKUP_CREATE = 'system_backup_create',
  SYSTEM_BACKUP_RESTORE = 'system_backup_restore',

  // Moderation
  CONTENT_APPROVE = 'content_approve',
  CONTENT_REJECT = 'content_reject',

  // Alerts
  ALERT_ACKNOWLEDGE = 'alert_acknowledge',
  ALERT_RESOLVE = 'alert_resolve',
  ALERT_RULE_CREATE = 'alert_rule_create',
  ALERT_RULE_UPDATE = 'alert_rule_update',
  ALERT_RULE_DELETE = 'alert_rule_delete',
}

export enum ActorType {
  ADMIN = 'admin',
  USER = 'user',
  SYSTEM = 'system',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('audit_logs')
@Index(['action'])
@Index(['actorType', 'actorId'])
@Index(['targetType', 'targetId'])
@Index(['createdAt'])
@Index(['action', 'createdAt'])
@Index(['status'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  action: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  actorType: ActorType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  actorId: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  actorName: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  targetType: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  targetId: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  targetName: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  details: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  ipAddress: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  userAgent: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: AuditStatus.SUCCESS,
  })
  status: AuditStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
