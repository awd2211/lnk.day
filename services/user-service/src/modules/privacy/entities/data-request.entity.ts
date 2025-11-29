import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum DataRequestType {
  EXPORT = 'export',           // 数据导出请求
  DELETE = 'delete',           // 账户删除请求
  ACCESS = 'access',           // 数据访问请求
  RECTIFICATION = 'rectification', // 数据更正请求
  RESTRICT = 'restrict',       // 限制处理请求
  PORTABILITY = 'portability', // 数据可移植性请求
}

export enum DataRequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

@Entity('data_requests')
@Index(['type', 'status'])
@Index(['status', 'createdAt'])
export class DataRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: DataRequestType })
  @Index()
  type: DataRequestType;

  @Column({ type: 'enum', enum: DataRequestStatus, default: DataRequestStatus.PENDING })
  @Index()
  status: DataRequestStatus;

  // 请求原因（可选）
  @Column({ nullable: true, type: 'text' })
  reason: string;

  // 处理完成后的下载链接（导出请求）
  @Column({ nullable: true })
  downloadUrl: string;

  // 下载链接过期时间
  @Column({ type: 'timestamp with time zone', nullable: true })
  downloadExpiresAt: Date;

  // 删除请求的冷静期结束时间
  @Column({ type: 'timestamp with time zone', nullable: true })
  coolingPeriodEndsAt: Date;

  // 请求的 IP 地址
  @Column({ nullable: true })
  ipAddress: string;

  // 处理备注
  @Column({ nullable: true, type: 'text' })
  processingNotes: string;

  // 处理完成时间
  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
