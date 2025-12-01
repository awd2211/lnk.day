import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type UTMTemplateCategory = 'advertising' | 'social' | 'email' | 'affiliate' | 'content' | 'other';

@Entity('utm_template_presets')
export class UTMTemplatePreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ default: 'other' })
  @Index()
  category: UTMTemplateCategory;

  @Column({ nullable: true })
  @Index()
  platform?: string; // google_ads, facebook, twitter, linkedin, tiktok, etc.

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

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
