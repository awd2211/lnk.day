import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('utm_templates')
@Index(['teamId', 'name'])
export class UTMTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  createdBy: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ nullable: true })
  medium?: string;

  @Column({ nullable: true })
  campaign?: string;

  @Column({ nullable: true })
  term?: string;

  @Column({ nullable: true })
  content?: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column('simple-array', { default: '' })
  tags: string[];

  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
