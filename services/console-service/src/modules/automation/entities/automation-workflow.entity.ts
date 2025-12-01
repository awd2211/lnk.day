import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type TriggerType = 'event' | 'schedule' | 'manual' | 'webhook';
export type WorkflowStatus = 'success' | 'failed' | 'running';

@Entity('automation_workflows')
export class AutomationWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb')
  trigger: {
    type: TriggerType;
    config: Record<string, any>;
  };

  @Column('jsonb', { default: [] })
  actions: {
    type: string;
    config: Record<string, any>;
  }[];

  @Column('jsonb', { nullable: true })
  conditions?: {
    field: string;
    operator: string;
    value: any;
  }[];

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  executionCount: number;

  @Column({ nullable: true })
  lastExecuted?: Date;

  @Column({ nullable: true })
  lastStatus?: WorkflowStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
