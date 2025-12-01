import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TeamPlan {
  FREE = 'FREE',
  CORE = 'CORE',
  GROWTH = 'GROWTH',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TeamStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

@Entity('teams')
@Index(['plan', 'createdAt'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index()
  slug: string;

  @Column({ type: 'varchar' })
  @Index()
  ownerId: string;

  // owner 信息在 service 层手动加载 (因为 ownerId 是 varchar 而 users.id 是 uuid)
  owner?: any;

  @Column({ type: 'enum', enum: TeamPlan, default: TeamPlan.FREE })
  @Index()
  plan: TeamPlan;

  @Column({ type: 'enum', enum: TeamStatus, default: TeamStatus.ACTIVE })
  @Index()
  status: TeamStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
