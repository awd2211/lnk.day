import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AutomationTriggerType {
  // 时间触发器
  SCHEDULE = 'schedule',           // 定时执行
  TIME_BASED = 'time_based',       // 基于时间条件

  // 事件触发器
  GOAL_REACHED = 'goal_reached',   // 达成目标
  CLICKS_THRESHOLD = 'clicks_threshold',  // 点击数阈值
  CONVERSION_THRESHOLD = 'conversion_threshold', // 转化阈值
  BUDGET_THRESHOLD = 'budget_threshold', // 预算阈值

  // 活动触发器
  CAMPAIGN_START = 'campaign_start',  // 活动开始
  CAMPAIGN_END = 'campaign_end',      // 活动结束
  CAMPAIGN_STATUS_CHANGE = 'campaign_status_change', // 状态变更

  // 性能触发器
  CTR_THRESHOLD = 'ctr_threshold',    // 点击率阈值
  LOW_PERFORMANCE = 'low_performance', // 低表现
  HIGH_PERFORMANCE = 'high_performance', // 高表现
}

export enum AutomationActionType {
  // 通知动作
  SEND_EMAIL = 'send_email',
  SEND_WEBHOOK = 'send_webhook',
  SEND_SLACK = 'send_slack',

  // 活动动作
  PAUSE_CAMPAIGN = 'pause_campaign',
  RESUME_CAMPAIGN = 'resume_campaign',
  END_CAMPAIGN = 'end_campaign',
  ARCHIVE_CAMPAIGN = 'archive_campaign',

  // 链接动作
  PAUSE_LINKS = 'pause_links',
  UPDATE_LINKS = 'update_links',
  REDIRECT_LINKS = 'redirect_links',

  // 预算动作
  ADJUST_BUDGET = 'adjust_budget',
  REALLOCATE_BUDGET = 'reallocate_budget',

  // 标签动作
  ADD_TAGS = 'add_tags',
  REMOVE_TAGS = 'remove_tags',

  // 创建动作
  CREATE_REPORT = 'create_report',
  DUPLICATE_CAMPAIGN = 'duplicate_campaign',
}

export enum AutomationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface TriggerCondition {
  type: AutomationTriggerType;
  // 通用条件
  campaignId?: string;
  campaignIds?: string[];

  // 阈值条件
  threshold?: number;
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  metric?: 'clicks' | 'conversions' | 'revenue' | 'ctr' | 'budget_spent';

  // 时间条件
  scheduleType?: 'once' | 'daily' | 'weekly' | 'monthly';
  scheduleTime?: string; // HH:mm
  scheduleDays?: number[]; // 0-6 for weekly, 1-31 for monthly
  scheduleDate?: string; // YYYY-MM-DD for once

  // 状态条件
  fromStatus?: string;
  toStatus?: string;
}

export interface ActionConfig {
  type: AutomationActionType;

  // 通知配置
  recipients?: string[];
  subject?: string;
  message?: string;
  webhookUrl?: string;
  slackChannel?: string;

  // 活动配置
  targetCampaignId?: string;

  // 链接配置
  linkIds?: string[];
  newDestination?: string;

  // 预算配置
  budgetChange?: number; // 正数增加，负数减少
  budgetPercentage?: number; // 百分比调整

  // 标签配置
  tags?: string[];

  // 报告配置
  reportType?: string;
  reportRecipients?: string[];
}

export interface ExecutionLog {
  timestamp: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  details?: any;
}

@Entity('automation_rules')
@Index(['teamId', 'status'])
@Index(['teamId', 'triggerType'])
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  createdBy: string;

  @Column({
    type: 'enum',
    enum: AutomationTriggerType,
  })
  @Index()
  triggerType: AutomationTriggerType;

  @Column('jsonb')
  triggerCondition: TriggerCondition;

  @Column('jsonb')
  actions: ActionConfig[];

  @Column({
    type: 'enum',
    enum: AutomationStatus,
    default: AutomationStatus.ACTIVE,
  })
  @Index()
  status: AutomationStatus;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ default: 0 })
  priority: number; // 优先级，数字越大优先级越高

  @Column({ nullable: true })
  campaignId?: string; // 如果绑定到特定活动

  @Column('simple-array', { default: '' })
  campaignIds: string[]; // 或者应用到多个活动

  @Column({ default: 0 })
  executionCount: number;

  @Column({ nullable: true })
  lastExecutedAt?: Date;

  @Column({ nullable: true })
  nextScheduledAt?: Date;

  @Column('jsonb', { default: [] })
  executionHistory: ExecutionLog[];

  @Column({ default: 100 })
  maxExecutions: number; // 最大执行次数，0 表示无限

  @Column('jsonb', { default: {} })
  settings: {
    cooldownMinutes?: number; // 执行冷却时间
    executeOnce?: boolean; // 仅执行一次
    notifyOnExecution?: boolean; // 执行时通知
    notifyOnError?: boolean; // 错误时通知
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
