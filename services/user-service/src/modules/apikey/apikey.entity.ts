import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ApiKeyScope {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

@Entity('api_keys')
@Index(['teamId', 'isActive'])
@Index(['teamId', 'createdAt'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ unique: true })
  @Index()
  keyHash: string;

  @Column()
  keyPrefix: string; // First 8 chars for display, e.g., "lnk_abc1..."

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  teamId: string;

  @Column('simple-array')
  scopes: ApiKeyScope[];

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  rateLimit?: number; // Requests per minute

  @Column('simple-array', { default: '' })
  allowedIps: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
