import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LinkStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('links')
@Index(['teamId', 'createdAt'])
@Index(['teamId', 'status'])
@Index(['teamId', 'folderId'])
@Index(['userId', 'createdAt'])
export class Link {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  shortCode: string;

  @Column()
  originalUrl: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'lnk.day' })
  @Index()
  domain: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  @Index()
  userId: string;

  @Column({ nullable: true })
  @Index()
  folderId?: string;

  @Column('simple-array', { default: '' })
  tags: string[];

  @Column('jsonb', { nullable: true })
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  @Column('jsonb', { default: {} })
  settings: {
    passwordProtected?: boolean;
    password?: string;
    geoTargeting?: Array<{
      country: string;
      region?: string;
      city?: string;
      targetUrl: string;
    }>;
    deviceTargeting?: Array<{
      deviceType: string;
      targetUrl: string;
    }>;
    timeTargeting?: Array<{
      startDate: string;
      endDate: string;
      startTime?: string;
      endTime?: string;
      timezone?: string;
      targetUrl: string;
    }>;
    cloaking?: boolean;
  };

  @Column({ type: 'enum', enum: LinkStatus, default: LinkStatus.ACTIVE })
  @Index()
  status: LinkStatus;

  @Column({ default: 0 })
  totalClicks: number;

  @Column({ default: 0 })
  uniqueClicks: number;

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
