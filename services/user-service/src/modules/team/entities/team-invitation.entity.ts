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
import { Team } from './team.entity';
import { User } from '../../user/entities/user.entity';
import { TeamMemberRole } from './team-member.entity';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

@Entity('team_invitations')
@Index(['teamId', 'status'])
@Index(['status', 'expiresAt'])
export class TeamInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  // 邀请的邮箱（可以是未注册用户）
  @Column()
  @Index()
  email: string;

  // 邀请 token（用于接受邀请的链接）
  @Column({ unique: true })
  @Index()
  token: string;

  // 分配的角色
  @Column({ type: 'enum', enum: TeamMemberRole, default: TeamMemberRole.MEMBER })
  role: TeamMemberRole;

  // 邀请状态
  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  // 邀请人
  @Column()
  @Index()
  invitedById: string;

  // 被邀请人（如果已注册）
  @Column({ nullable: true })
  inviteeId: string;

  // 过期时间
  @Column()
  expiresAt: Date;

  // 个性化邀请消息
  @Column({ nullable: true, type: 'text' })
  message: string;

  // 邮件发送次数
  @Column({ default: 0 })
  emailsSent: number;

  // 最后发送邮件时间
  @Column({ nullable: true })
  lastEmailSentAt: Date;

  // 接受/拒绝时间
  @Column({ nullable: true })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'inviteeId' })
  invitee: User;
}
