import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Link } from '../../link/entities/link.entity';

export enum FlagReason {
  PHISHING = 'phishing',
  MALWARE = 'malware',
  SPAM = 'spam',
  ADULT = 'adult',
  SCAM = 'scam',
  ABUSE = 'abuse',
  OTHER = 'other',
}

export enum FlagSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FlagStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
}

@Entity('flagged_links')
@Index(['teamId', 'status'])
@Index(['status', 'severity'])
export class FlaggedLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  linkId: string;

  @ManyToOne(() => Link, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linkId' })
  link: Link;

  @Column()
  shortUrl: string;

  @Column()
  destinationUrl: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  userName?: string;

  @Column({ nullable: true })
  userEmail?: string;

  @Column({ nullable: true })
  @Index()
  teamId?: string;

  @Column({ type: 'enum', enum: FlagReason, default: FlagReason.OTHER })
  reason: FlagReason;

  @Column({ type: 'enum', enum: FlagSeverity, default: FlagSeverity.MEDIUM })
  @Index()
  severity: FlagSeverity;

  @Column({ type: 'enum', enum: FlagStatus, default: FlagStatus.PENDING })
  @Index()
  status: FlagStatus;

  @Column({ default: 0 })
  reportCount: number;

  @Column({ default: false })
  autoDetected: boolean;

  @Column({ nullable: true })
  detectedBy?: string;

  @Column({ nullable: true })
  reviewedAt?: Date;

  @Column({ nullable: true })
  reviewedBy?: string;

  @Column({ nullable: true })
  reviewerName?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  @Index()
  detectedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
