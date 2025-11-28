import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('slack_installations')
export class SlackInstallation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string; // lnk.day team ID

  @Column()
  @Index({ unique: true })
  slackTeamId: string; // Slack workspace ID

  @Column()
  slackTeamName: string;

  @Column({ nullable: true })
  slackEnterpriseId?: string;

  @Column({ nullable: true })
  slackEnterpriseName?: string;

  // Bot 相关
  @Column()
  botUserId: string;

  @Column()
  botAccessToken: string;

  @Column('simple-array')
  botScopes: string[];

  // User 相关（可选，用于用户级别操作）
  @Column({ nullable: true })
  userAccessToken?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column('simple-array', { nullable: true })
  userScopes?: string[];

  // Incoming Webhook（可选）
  @Column({ nullable: true })
  incomingWebhookUrl?: string;

  @Column({ nullable: true })
  incomingWebhookChannel?: string;

  @Column({ nullable: true })
  incomingWebhookChannelId?: string;

  // 默认通知频道
  @Column({ nullable: true })
  defaultChannelId?: string;

  // 配置
  @Column('jsonb', { default: {} })
  settings: {
    notifyOnLinkCreate?: boolean;
    notifyOnMilestone?: boolean;
    notifyOnAlert?: boolean;
    weeklyReport?: boolean;
    milestoneThresholds?: number[];
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  installedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
