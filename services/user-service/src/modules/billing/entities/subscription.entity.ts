import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PlanType } from '../../quota/quota.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  TRIALING = 'trialing',
  PAUSED = 'paused',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('subscriptions')
@Index(['status', 'currentPeriodEnd'])
@Index(['plan', 'status'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ type: 'enum', enum: PlanType })
  @Index()
  plan: PlanType;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  @Index()
  status: SubscriptionStatus;

  @Column({ type: 'enum', enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Column({ type: 'enum', enum: PaymentProvider, nullable: true })
  paymentProvider?: PaymentProvider;

  @Column({ nullable: true })
  externalSubscriptionId?: string; // Stripe subscription ID, etc.

  @Column({ nullable: true })
  externalCustomerId?: string; // Stripe customer ID, etc.

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'timestamp with time zone' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp with time zone' })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  trialEndsAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  canceledAt?: Date;

  @Column({ default: false })
  cancelAtPeriodEnd: boolean;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('invoices')
@Index(['status', 'dueDate'])
@Index(['teamId', 'createdAt'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  @Index()
  subscriptionId: string;

  @Column({ unique: true })
  @Index()
  invoiceNumber: string;

  @Column({ type: 'enum', enum: PaymentProvider, nullable: true })
  paymentProvider?: PaymentProvider;

  @Column({ nullable: true })
  externalInvoiceId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 'pending' })
  status: string; // pending, paid, failed, void

  @Column({ type: 'timestamp with time zone' })
  dueDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt?: Date;

  @Column('jsonb', { nullable: true })
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  @Column({ nullable: true })
  pdfUrl?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  refundedAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount?: number;

  @Column({ nullable: true })
  refundReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({ nullable: true })
  externalPaymentMethodId?: string;

  @Column()
  type: string; // card, bank_transfer, alipay, wechat

  @Column({ nullable: true })
  last4?: string;

  @Column({ nullable: true })
  brand?: string; // visa, mastercard, etc.

  @Column({ nullable: true })
  expiryMonth?: number;

  @Column({ nullable: true })
  expiryYear?: number;

  @Column({ default: false })
  isDefault: boolean;

  @Column('jsonb', { nullable: true })
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
