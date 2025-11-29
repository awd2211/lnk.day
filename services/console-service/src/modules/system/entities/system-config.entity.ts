import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type EmailProvider = 'smtp' | 'mailgun' | 'sendgrid' | 'ses';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  region: 'us' | 'eu';
}

export interface SendgridConfig {
  apiKey: string;
}

export interface SesConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

@Entity('system_configs')
export class SystemConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'jsonb' })
  value: Record<string, any>;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  isSecret: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
