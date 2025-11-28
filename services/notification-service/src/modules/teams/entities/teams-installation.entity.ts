import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('teams_installations')
export class TeamsInstallation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string; // lnk.day team ID

  @Column()
  name: string; // 配置名称

  @Column()
  webhookUrl: string; // Teams Incoming Webhook URL

  @Column({ nullable: true })
  channelName?: string; // Teams 频道名称 (仅供参考)

  // 配置
  @Column('jsonb', { default: {} })
  settings: {
    notifyOnLinkCreate?: boolean;
    notifyOnMilestone?: boolean;
    notifyOnAlert?: boolean;
    weeklyReport?: boolean;
    milestoneThresholds?: number[];
    notifyOnQRScan?: boolean;
    dailyDigest?: boolean;
    digestTime?: string; // HH:mm format
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
