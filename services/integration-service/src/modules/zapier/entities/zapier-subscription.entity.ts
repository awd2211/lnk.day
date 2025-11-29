import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type TriggerEvent =
  | 'link.created'
  | 'link.clicked'
  | 'link.updated'
  | 'link.deleted'
  | 'link.milestone'
  | 'qr.scanned'
  | 'page.published'
  | 'user.invited'
  | 'campaign.started'
  | 'campaign.ended';

@Entity('zapier_subscriptions')
export class ZapierSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  event: TriggerEvent;

  @Column()
  webhookUrl: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ nullable: true })
  lastFailure?: Date;

  @Column({ nullable: true })
  zapId?: string; // Zapier's internal ID for the Zap

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
