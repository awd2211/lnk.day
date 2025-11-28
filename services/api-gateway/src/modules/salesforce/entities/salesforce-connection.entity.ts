import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('salesforce_connections')
export class SalesforceConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  teamId: string;

  @Column()
  instanceUrl: string; // e.g., https://na1.salesforce.com

  @Column()
  accessToken: string;

  @Column()
  refreshToken: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  orgId?: string;

  @Column({ nullable: true })
  userId?: string;

  // Sync settings
  @Column('jsonb', { default: {} })
  settings: {
    syncLeads?: boolean;
    syncContacts?: boolean;
    syncOpportunities?: boolean;
    logActivities?: boolean;
    autoCreateLeads?: boolean;
    fieldMapping?: Record<string, string>;
  };

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
