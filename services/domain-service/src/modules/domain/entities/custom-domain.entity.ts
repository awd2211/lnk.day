import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum DomainStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  VERIFIED = 'verified',
  FAILED = 'failed',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum SSLStatus {
  NONE = 'none',
  PENDING = 'pending',
  PROVISIONING = 'provisioning',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export enum DomainType {
  REDIRECT = 'redirect',
  PAGE = 'page',
  BOTH = 'both',
}

@Entity('custom_domains')
@Unique(['domain'])
export class CustomDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  userId: string;

  @Column()
  @Index()
  domain: string;

  @Column({ type: 'enum', enum: DomainType, default: DomainType.REDIRECT })
  type: DomainType;

  @Column({ type: 'enum', enum: DomainStatus, default: DomainStatus.PENDING })
  status: DomainStatus;

  @Column({ type: 'enum', enum: SSLStatus, default: SSLStatus.NONE })
  sslStatus: SSLStatus;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ nullable: true })
  verificationMethod: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  sslIssuedAt: Date;

  @Column({ nullable: true })
  sslExpiresAt: Date;

  @Column({ nullable: true })
  lastCheckAt: Date;

  @Column({ nullable: true })
  lastCheckError: string | null;

  @Column({ default: 0 })
  verificationAttempts: number;

  @Column('jsonb', { nullable: true })
  dnsRecords: {
    type: string;
    name: string;
    value: string;
    ttl?: number;
  }[];

  @Column('jsonb', { nullable: true })
  settings: {
    fallbackUrl?: string;
    forceHttps?: boolean;
    hsts?: boolean;
    customNotFoundPage?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
