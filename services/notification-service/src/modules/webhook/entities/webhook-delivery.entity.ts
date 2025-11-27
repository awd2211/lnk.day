import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { WebhookEventType } from './webhook-endpoint.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  webhookId: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ type: 'enum', enum: WebhookEventType })
  event: WebhookEventType;

  @Column('jsonb')
  payload: Record<string, any>;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Column({ nullable: true })
  responseStatus: number;

  @Column({ type: 'text', nullable: true })
  responseBody: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true })
  nextRetryAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;
}
