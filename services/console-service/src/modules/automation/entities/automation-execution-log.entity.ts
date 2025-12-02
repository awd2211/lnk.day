import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AutomationWorkflow, WorkflowStatus } from './automation-workflow.entity';

@Entity('automation_execution_logs')
export class AutomationExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  workflowId: string;

  @ManyToOne(() => AutomationWorkflow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflowId' })
  workflow: AutomationWorkflow;

  @Column()
  status: WorkflowStatus;

  @Column({ nullable: true })
  triggerEvent?: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  error?: string;

  @Column('jsonb', { nullable: true })
  inputData?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  outputData?: Record<string, any>;
}
