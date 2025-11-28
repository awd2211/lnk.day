import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Dynamic QR Code - stores QR configuration that can be updated without changing the QR image
 * The QR code points to a redirect URL, and the destination can be changed anytime
 */
@Entity('dynamic_qr_codes')
export class DynamicQrCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  createdBy: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // The short code used in the redirect URL
  @Column({ unique: true })
  @Index()
  shortCode: string;

  // Current destination URL
  @Column('text')
  destinationUrl: string;

  // URL change history for analytics
  @Column('jsonb', { default: [] })
  urlHistory: Array<{
    url: string;
    changedAt: string;
    changedBy: string;
    reason?: string;
  }>;

  // QR styling configuration (persisted)
  @Column('jsonb', { nullable: true })
  qrOptions: {
    size?: number;
    foregroundColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
    logoSize?: number;
    gradient?: {
      enabled: boolean;
      startColor: string;
      endColor: string;
      direction: 'horizontal' | 'vertical' | 'diagonal';
    };
    eyeStyle?: {
      outer: string;
      inner: string;
      color?: string;
    };
    textLabel?: {
      enabled: boolean;
      text: string;
      fontSize?: number;
      color?: string;
      position?: 'bottom' | 'top';
    };
  };

  // Statistics
  @Column({ default: 0 })
  totalScans: number;

  @Column({ nullable: true })
  lastScannedAt: Date;

  // Status
  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  expiresAt: Date;

  // Tags for organization
  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ nullable: true })
  folderId: string;

  // Scheduling (optional)
  @Column('jsonb', { nullable: true })
  schedule: {
    enabled: boolean;
    rules: Array<{
      days: number[]; // 0-6 (Sunday-Saturday)
      startTime: string; // HH:mm
      endTime: string;
      url: string;
    }>;
    defaultUrl: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
