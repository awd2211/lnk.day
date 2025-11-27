import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Link } from './link.entity';

export enum ScheduleAction {
  PUBLISH = 'publish',
  UNPUBLISH = 'unpublish',
  EXPIRE = 'expire',
}

export enum ScheduleStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

@Entity('link_schedules')
export class LinkSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  linkId: string;

  @ManyToOne(() => Link, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linkId' })
  link: Link;

  @Column({ type: 'enum', enum: ScheduleAction })
  action: ScheduleAction;

  @Column({ type: 'timestamp with time zone' })
  @Index()
  scheduledAt: Date;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ type: 'enum', enum: ScheduleStatus, default: ScheduleStatus.PENDING })
  status: ScheduleStatus;

  @Column({ nullable: true })
  executedAt?: Date;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
