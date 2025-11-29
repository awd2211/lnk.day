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

  @Column()
  @Index()
  ownerId: string;

  @Column({ type: 'enum', enum: TeamPlan, default: TeamPlan.FREE })
  @Index()
  plan: TeamPlan;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
