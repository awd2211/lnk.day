import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdminRoleEntity } from '../../system/entities/admin-role.entity';

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  // Email verification fields
  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  emailVerifyToken?: string;

  @Column({ nullable: true })
  emailVerifyExpires?: Date;

  // Pending email change (waiting for verification)
  @Column({ nullable: true })
  pendingEmail?: string;

  // Email change verification (verify old email first)
  @Column({ nullable: true })
  emailChangeCode?: string;

  @Column({ nullable: true })
  emailChangeCodeExpires?: Date;

  // Whether old email has been verified for email change
  @Column({ default: false })
  emailChangeOldVerified: boolean;

  @Column()
  name: string;

  @Column({ nullable: true })
  password?: string;

  // Invitation fields
  @Column({ nullable: true })
  inviteToken?: string;

  @Column({ nullable: true })
  inviteExpires?: Date;

  @Column({ default: 'pending' })
  @Index()
  status: 'pending' | 'active' | 'suspended';

  /**
   * 关联的角色实体
   */
  @ManyToOne(() => AdminRoleEntity, { eager: true })
  @JoinColumn({ name: 'role_id' })
  roleEntity: AdminRoleEntity;

  @Column({ name: 'role_id' })
  @Index()
  roleId: string;

  /**
   * 权限版本号（用于实时失效 Token）
   * 当管理员权限变更时递增，旧 Token 将失效
   */
  @Column({ name: 'permission_version', default: 1 })
  permissionVersion: number;

  // active 已被 status 字段取代

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetExpires?: Date;

  // Login code fields (for email verification code login)
  @Column({ nullable: true })
  loginCode?: string;

  @Column({ nullable: true })
  loginCodeExpires?: Date;

  // 2FA fields
  @Column({ nullable: true })
  twoFactorSecret?: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'simple-array', nullable: true })
  twoFactorBackupCodes?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
