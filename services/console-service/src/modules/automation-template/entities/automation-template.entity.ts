import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TriggerType } from '../../automation/entities/automation-workflow.entity';

export type TemplateCategory = 'notification' | 'moderation' | 'analytics' | 'integration' | 'custom';

/**
 * Automation Template - 保存自动化工作流配置供复用
 */
@Entity('automation_templates')
@Index(['teamId', 'isFavorite'])
@Index(['teamId', 'category'])
@Index(['teamId', 'createdAt'])
export class AutomationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  @Index()
  createdBy: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  color: string;

  // ========== 分类 ==========
  @Column({ default: 'custom' })
  @Index()
  category: TemplateCategory;

  // ========== 触发器配置 ==========
  @Column('jsonb')
  trigger: {
    type: TriggerType;
    config: {
      // event: eventType, filters
      // schedule: cron, timezone
      // webhook: secret, allowedIPs
      // manual: no config needed
      [key: string]: any;
    };
  };

  // ========== 动作列表 ==========
  @Column('jsonb', { default: [] })
  actions: Array<{
    type: 'send_email' | 'send_slack' | 'send_webhook' | 'update_link' | 'create_alert' | 'run_script';
    name?: string;
    config: Record<string, any>;
    // 可选：条件执行
    condition?: {
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith' | 'endsWith';
      value: any;
    };
  }>;

  // ========== 全局条件 ==========
  @Column('jsonb', { nullable: true })
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'notIn';
    value: any;
    logic?: 'AND' | 'OR';
  }>;

  // ========== 模板设置 ==========
  @Column({ default: false })
  isFavorite: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  // ========== 预设标签（用于快速筛选）==========
  @Column('simple-array', { nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
