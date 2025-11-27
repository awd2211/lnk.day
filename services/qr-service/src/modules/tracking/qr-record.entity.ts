import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum QrType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
}

export enum QrContentType {
  URL = 'url',
  PHONE = 'phone',
  SMS = 'sms',
  EMAIL = 'email',
  VCARD = 'vcard',
  WIFI = 'wifi',
  TEXT = 'text',
}

@Entity('qr_records')
export class QrRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  linkId?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'enum', enum: QrType, default: QrType.DYNAMIC })
  type: QrType;

  @Column({ type: 'enum', enum: QrContentType, default: QrContentType.URL })
  contentType: QrContentType;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  targetUrl?: string;

  @Column({ unique: true })
  @Index()
  shortCode: string;

  @Column('jsonb', { default: {} })
  style: {
    size?: number;
    foregroundColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
    logoSize?: number;
    dotStyle?: string;
    cornerRadius?: number;
    gradient?: {
      enabled: boolean;
      startColor: string;
      endColor: string;
      direction: string;
    };
  };

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ default: 0 })
  scanCount: number;

  @Column({ default: 0 })
  uniqueScans: number;

  @Column({ nullable: true })
  lastScannedAt?: Date;

  @Column({ nullable: true })
  campaignId?: string;

  @Column('simple-array', { default: '' })
  tags: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('qr_scans')
export class QrScan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  qrId: string;

  @Column({ nullable: true })
  visitorId?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  deviceType?: string;

  @Column({ nullable: true })
  browser?: string;

  @Column({ nullable: true })
  os?: string;

  @Column({ nullable: true })
  referer?: string;

  @Column({ nullable: true })
  language?: string;

  @CreateDateColumn()
  scannedAt: Date;
}
