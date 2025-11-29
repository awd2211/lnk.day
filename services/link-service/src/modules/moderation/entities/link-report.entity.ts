import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FlaggedLink, FlagReason } from './flagged-link.entity';

@Entity('link_reports')
@Index(['flaggedLinkId', 'createdAt'])
export class LinkReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  flaggedLinkId: string;

  @ManyToOne(() => FlaggedLink, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flaggedLinkId' })
  flaggedLink: FlaggedLink;

  @Column({ nullable: true })
  @Index()
  reporterId?: string;

  @Column({ nullable: true })
  reporterEmail?: string;

  @Column({ nullable: true })
  reporterIp?: string;

  @Column({ type: 'enum', enum: FlagReason, default: FlagReason.OTHER })
  reason: FlagReason;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  evidence?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
