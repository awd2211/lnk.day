import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_sessions')
@Index('IDX_user_sessions_user', ['userId'])
@Index('IDX_user_sessions_token', ['tokenHash'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ length: 64 })
  tokenHash: string;

  @Column({ length: 255, nullable: true })
  deviceName: string;

  @Column({ length: 50, nullable: true })
  deviceType: string; // desktop, mobile, tablet

  @Column({ length: 100, nullable: true })
  browser: string;

  @Column({ length: 50, nullable: true })
  os: string;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column({ length: 100, nullable: true })
  location: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isCurrent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
}
