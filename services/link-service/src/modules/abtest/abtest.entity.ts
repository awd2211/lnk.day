import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ABTestStatus {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export interface ABTestVariant {
  id: string;
  name: string;
  targetUrl: string;
  trafficPercentage: number;
  clicks?: number;
  conversions?: number;
}

@Entity('ab_tests')
export class ABTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  @Index()
  linkId: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  userId: string;

  @Column('jsonb')
  variants: ABTestVariant[];

  @Column({ type: 'enum', enum: ABTestStatus, default: ABTestStatus.DRAFT })
  status: ABTestStatus;

  @Column({ nullable: true })
  winnerVariantId?: string;

  @Column('simple-array', { default: '' })
  trackingGoals: string[];

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ default: 0 })
  totalClicks: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
