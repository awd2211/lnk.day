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

/**
 * @deprecated 使用 AdminRoleEntity 代替，保留用于向后兼容
 */
export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

@Entity('admins')
@Index(['role', 'active'])
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  /**
   * @deprecated 使用 roleEntity 代替
   */
  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.OPERATOR })
  @Index()
  role: AdminRole;

  /**
   * 关联的角色实体（新的权限系统）
   */
  @ManyToOne(() => AdminRoleEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'role_id' })
  roleEntity?: AdminRoleEntity;

  @Column({ nullable: true })
  @Index()
  roleId?: string;

  @Column({ default: true })
  @Index()
  active: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetExpires?: Date;

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
