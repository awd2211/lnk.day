import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('hubspot_connections')
export class HubSpotConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  teamId: string;

  @Column()
  hubspotPortalId: string; // HubSpot account ID

  @Column()
  accessToken: string;

  @Column()
  refreshToken: string;

  @Column()
  expiresAt: Date;

  @Column('simple-array')
  scopes: string[];

  // Sync settings
  @Column('jsonb', { default: {} })
  settings: {
    syncContacts?: boolean;
    syncDeals?: boolean;
    logActivities?: boolean;
    autoCreateContacts?: boolean;
    customPropertyMapping?: Record<string, string>;
  };

  // Webhook settings
  @Column({ nullable: true })
  webhookSubscriptionId?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastSyncAt?: Date;

  @Column({ nullable: true })
  lastError?: string;

  @CreateDateColumn()
  connectedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
