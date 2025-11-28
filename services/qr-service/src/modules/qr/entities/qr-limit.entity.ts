import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('qr_limits')
export class QrLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  qrId: string;

  @Column()
  teamId: string;

  // 扫码次数限制
  @Column({ nullable: true })
  maxScans: number;

  @Column({ default: 0 })
  currentScans: number;

  // 地理围栏限制 (允许的国家/地区代码)
  @Column('simple-array', { nullable: true })
  allowedCountries: string[];

  // 禁止的国家/地区
  @Column('simple-array', { nullable: true })
  blockedCountries: string[];

  // 时间限制
  @Column({ nullable: true })
  validFrom: Date;

  @Column({ nullable: true })
  validUntil: Date;

  // 每日扫码限制
  @Column({ nullable: true })
  dailyLimit: number;

  @Column({ default: 0 })
  todayScans: number;

  @Column({ nullable: true })
  lastScanDate: Date;

  // 是否启用
  @Column({ default: true })
  enabled: boolean;

  // 超出限制时的行为
  @Column({
    type: 'enum',
    enum: ['block', 'redirect', 'warn'],
    default: 'block',
  })
  limitAction: 'block' | 'redirect' | 'warn';

  // 超出限制时的重定向 URL
  @Column({ nullable: true })
  limitRedirectUrl: string;

  // 超出限制时显示的消息
  @Column({ nullable: true })
  limitMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
