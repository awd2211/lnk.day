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
import { AlertRule, AlertSeverity } from './alert-rule.entity';

// Re-export AlertSeverity for consumers
export { AlertSeverity };

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

@Entity('alerts')
@Index(['severity'])
@Index(['status'])
@Index(['createdAt'])
@Index(['status', 'severity'])
@Index(['status', 'createdAt'])
@Index(['ruleId'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: AlertSeverity.MEDIUM,
  })
  severity: AlertSeverity;

  @Column({
    type: 'varchar',
    length: 20,
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  source: string; // e.g., 'system', 'user-service', 'link-service'

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  category: string; // e.g., 'security', 'performance', 'quota', 'error'

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata: Record<string, any>;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  ruleId: string;

  @ManyToOne(() => AlertRule, { nullable: true })
  @JoinColumn({ name: 'ruleId' })
  rule: AlertRule;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  acknowledgedBy: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  acknowledgedAt: Date;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  resolvedBy: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  resolvedAt: Date;

  @Column({
    type: 'text',
    nullable: true,
  })
  resolution: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
