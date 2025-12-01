import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_DELETED = 'api_key_deleted',
  SESSION_REVOKED = 'session_revoked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  EMAIL_CHANGED = 'email_changed',
  PROFILE_UPDATED = 'profile_updated',
}

export enum SecurityEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Entity('security_events')
@Index('IDX_security_events_user', ['userId'])
@Index('IDX_security_events_type', ['type'])
@Index('IDX_security_events_created', ['createdAt'])
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: SecurityEventType,
  })
  type: SecurityEventType;

  @Column({
    type: 'enum',
    enum: SecurityEventSeverity,
    default: SecurityEventSeverity.INFO,
  })
  severity: SecurityEventSeverity;

  @Column({ length: 255 })
  description: string;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column({ length: 100, nullable: true })
  location: string;

  @Column({ length: 255, nullable: true })
  userAgent: string;

  @Column({ length: 100, nullable: true })
  deviceName: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
