import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  RuleType,
  RuleConditions,
} from '../../redirect-rules/entities/redirect-rule.entity';

/**
 * Redirect Rule Template - 保存重定向规则配置供复用
 */
@Entity('redirect_rule_templates')
@Index(['teamId', 'isFavorite'])
@Index(['teamId', 'category'])
@Index(['teamId', 'createdAt'])
export class RedirectRuleTemplate {
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
  category: 'ab_test' | 'geo' | 'device' | 'time' | 'language' | 'referrer' | 'custom';

  // ========== 规则配置 ==========

  @Column({
    type: 'enum',
    enum: RuleType,
    array: true,
    default: [],
  })
  types: RuleType[];

  @Column('jsonb', { default: {} })
  conditions: RuleConditions;

  // A/B 测试变体配置
  @Column('jsonb', { nullable: true })
  abTestVariants?: Array<{
    name: string;
    url: string;
    weight: number; // 0-100
  }>;

  // 地理位置规则预设
  @Column('jsonb', { nullable: true })
  geoPresets?: Array<{
    name: string;
    countries?: string[];
    regions?: string[];
    cities?: string[];
    url: string;
  }>;

  // 设备规则预设
  @Column('jsonb', { nullable: true })
  devicePresets?: Array<{
    name: string;
    deviceTypes?: ('desktop' | 'mobile' | 'tablet')[];
    operatingSystems?: string[];
    browsers?: string[];
    url: string;
  }>;

  // 时间规则预设
  @Column('jsonb', { nullable: true })
  timePresets?: Array<{
    name: string;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
    timezone?: string;
    url: string;
  }>;

  // 默认目标 URL
  @Column({ nullable: true })
  defaultTargetUrl?: string;

  // 默认优先级
  @Column({ nullable: true })
  defaultPriority?: number;

  // ========== 模板设置 ==========

  @Column({ default: false })
  isFavorite: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
