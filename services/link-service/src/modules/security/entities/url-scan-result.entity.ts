import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('url_scan_results')
@Index(['url', 'scannedAt'])
export class UrlScanResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  url: string;

  @Column({ nullable: true })
  @Index()
  teamId?: string;

  @Column({ nullable: true })
  linkId?: string;

  @Column({ default: true })
  safe: boolean;

  @Column({ type: 'int', default: 50 })
  reputationScore: number;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  reputationCategory: 'trusted' | 'safe' | 'suspicious' | 'malicious' | 'unknown';

  @Column('jsonb', { default: [] })
  threats: Array<{
    type: string;
    platform: string;
    url: string;
  }>;

  @Column('jsonb', { default: [] })
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }>;

  @Column({ nullable: true })
  domainAge?: number;

  @Column({ nullable: true })
  sslValid?: boolean;

  @Column('simple-array', { nullable: true })
  flaggedBy?: string[];

  @CreateDateColumn()
  @Index()
  scannedAt: Date;
}
