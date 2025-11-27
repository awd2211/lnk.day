import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('two_factor_secrets')
export class TwoFactorSecret {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  userId: string;

  @Column({ type: 'text' })
  secret: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column('simple-array', { nullable: true })
  backupCodes: string[];

  @Column({ default: 0 })
  backupCodesUsed: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
