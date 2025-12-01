import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type QRStyleCategory = 'classic' | 'modern' | 'gradient' | 'branded' | 'artistic';
export type DotStyle = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded';
export type EyeStyle = 'square' | 'circle' | 'leaf' | 'rounded';

@Entity('qr_style_presets')
export class QRStylePreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'classic' })
  @Index()
  category: QRStyleCategory;

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column('jsonb', { default: {} })
  style: {
    foregroundColor: string;
    backgroundColor: string;
    cornerRadius?: number;
    dotStyle?: DotStyle;
    gradient?: {
      enabled: boolean;
      startColor: string;
      endColor: string;
      direction: 'vertical' | 'horizontal' | 'diagonal';
    };
    eyeStyle?: {
      outer: EyeStyle;
      inner: EyeStyle;
      color?: string;
    };
    logoPlaceholder?: {
      enabled: boolean;
      size: 'small' | 'medium' | 'large';
    };
    border?: {
      enabled: boolean;
      color: string;
      width: number;
      style: 'solid' | 'dashed' | 'dotted';
    };
    quietZone?: number;
  };

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ default: false })
  isPremium: boolean;

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
