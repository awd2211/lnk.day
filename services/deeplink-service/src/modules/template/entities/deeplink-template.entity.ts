import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IOSConfig, AndroidConfig, SocialMetadata } from '../../deeplink/entities/deeplink.entity';

/**
 * DeepLink Template - 保存 iOS/Android 深度链接配置供复用
 */
@Entity('deeplink_templates')
@Index(['teamId', 'isFavorite'])
@Index(['teamId', 'createdAt'])
export class DeepLinkTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  @Index()
  createdBy: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  color: string;

  // ========== iOS 配置 ==========
  @Column('jsonb', { nullable: true })
  iosConfig?: IOSConfig;

  // ========== Android 配置 ==========
  @Column('jsonb', { nullable: true })
  androidConfig?: AndroidConfig;

  // ========== 通用配置 ==========
  @Column({ nullable: true })
  fallbackUrl?: string;

  @Column({ nullable: true })
  desktopUrl?: string;

  @Column('jsonb', { nullable: true })
  socialMetadata?: SocialMetadata;

  @Column({ default: false })
  deferredDeepLinking: boolean;

  @Column({ nullable: true })
  attributionWindow?: number; // hours

  @Column('jsonb', { default: {} })
  customData: Record<string, any>;

  // ========== 模板设置 ==========
  @Column({ default: false })
  isFavorite: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
