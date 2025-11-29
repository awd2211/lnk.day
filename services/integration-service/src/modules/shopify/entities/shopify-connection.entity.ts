import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('shopify_connections')
export class ShopifyConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  teamId: string;

  @Column()
  @Index({ unique: true })
  shopDomain: string; // e.g., myshop.myshopify.com

  @Column()
  accessToken: string;

  @Column('simple-array')
  scopes: string[];

  // Store info
  @Column({ nullable: true })
  shopName?: string;

  @Column({ nullable: true })
  shopEmail?: string;

  @Column({ nullable: true })
  currency?: string;

  // Settings
  @Column('jsonb', { default: {} })
  settings: {
    autoCreateProductLinks?: boolean;
    linkPrefix?: string; // Custom prefix for product links
    includeSku?: boolean;
    trackOrders?: boolean;
    syncDiscounts?: boolean;
    defaultUtmSource?: string;
    defaultUtmMedium?: string;
  };

  // Webhooks
  @Column('jsonb', { default: {} })
  webhookIds: {
    productCreate?: string;
    productUpdate?: string;
    productDelete?: string;
    orderCreate?: string;
    orderPaid?: string;
    appUninstalled?: string;
  };

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ nullable: true })
  lastSyncAt?: Date;

  @Column({ default: 0 })
  linkedProductsCount: number;

  @CreateDateColumn()
  installedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
