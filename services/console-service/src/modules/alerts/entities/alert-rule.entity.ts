import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Define AlertSeverity here to avoid circular dependency
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RuleType {
  THRESHOLD = 'threshold', // e.g., CPU > 80%
  ANOMALY = 'anomaly', // e.g., unusual login pattern
  SCHEDULE = 'schedule', // e.g., check every 5 minutes
  EVENT = 'event', // e.g., on user deletion
}

export enum RuleConditionOperator {
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'ne',
  CONTAINS = 'contains',
}

export interface RuleCondition {
  metric: string;
  operator: RuleConditionOperator;
  value: number | string;
  duration?: number; // in seconds, for sustained threshold
}

@Entity('alert_rules')
@Index(['enabled'])
@Index(['type'])
@Index(['enabled', 'type'])
@Index(['type', 'source'])
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: RuleType.THRESHOLD,
  })
  type: RuleType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  source: string; // Which service/metric to monitor

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  category: string;

  @Column({
    type: 'jsonb',
  })
  conditions: RuleCondition[];

  @Column({
    type: 'varchar',
    length: 20,
    default: AlertSeverity.MEDIUM,
  })
  severity: AlertSeverity;

  @Column({
    type: 'boolean',
    default: true,
  })
  enabled: boolean;

  @Column({
    type: 'int',
    default: 300, // 5 minutes
  })
  cooldownSeconds: number; // Minimum time between alerts

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  notificationChannels: string[]; // e.g., ['email', 'slack']

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  notificationConfig: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  createdBy: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  lastTriggeredAt: Date;

  @Column({
    type: 'int',
    default: 0,
  })
  triggerCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
