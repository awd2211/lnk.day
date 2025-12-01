import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IntegrationType {
  ZAPIER = 'zapier',
  HUBSPOT = 'hubspot',
  SALESFORCE = 'salesforce',
  SHOPIFY = 'shopify',
}

@Entity('integration_configs')
@Index(['type'], { unique: true })
export class IntegrationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: IntegrationType;

  @Column({
    type: 'varchar',
    length: 100,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  enabled: boolean;

  // OAuth 配置
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  clientId: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  clientSecret: string;

  // Zapier 特定配置
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  webhookSecret: string;

  // Shopify 特定配置
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  apiKey: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  apiSecret: string;

  // 通用配置
  @Column({
    type: 'simple-array',
    nullable: true,
  })
  scopes: string[];

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  callbackUrl: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  webhookUrl: string;

  // 额外配置（JSON）
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  settings: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
