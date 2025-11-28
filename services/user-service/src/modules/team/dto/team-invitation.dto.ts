import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsString,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TeamMemberRole } from '../entities/team-member.entity';
import { InvitationStatus } from '../entities/team-invitation.entity';

// 单个邀请
export class CreateInvitationDto {
  @ApiProperty({ description: '被邀请人邮箱', example: 'member@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '分配的角色',
    enum: TeamMemberRole,
    default: TeamMemberRole.MEMBER,
  })
  @IsEnum(TeamMemberRole)
  @IsOptional()
  role?: TeamMemberRole = TeamMemberRole.MEMBER;

  @ApiProperty({ description: '邀请消息（可选）', required: false })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  message?: string;
}

// 批量邀请项
export class BulkInviteItem {
  @ApiProperty({ description: '被邀请人邮箱' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '分配的角色', enum: TeamMemberRole, required: false })
  @IsEnum(TeamMemberRole)
  @IsOptional()
  role?: TeamMemberRole;
}

// 批量邀请
export class BulkInviteDto {
  @ApiProperty({ description: '邀请列表', type: [BulkInviteItem] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BulkInviteItem)
  invitations: BulkInviteItem[];

  @ApiProperty({ description: '默认角色', enum: TeamMemberRole, required: false })
  @IsEnum(TeamMemberRole)
  @IsOptional()
  defaultRole?: TeamMemberRole = TeamMemberRole.MEMBER;

  @ApiProperty({ description: '邀请消息（可选）', required: false })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  message?: string;
}

// 接受邀请
export class AcceptInvitationDto {
  @ApiProperty({ description: '邀请 token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

// 拒绝邀请
export class DeclineInvitationDto {
  @ApiProperty({ description: '邀请 token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: '拒绝原因（可选）', required: false })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}

// 邀请查询
export class InvitationQueryDto {
  @ApiProperty({ description: '状态筛选', enum: InvitationStatus, required: false })
  @IsEnum(InvitationStatus)
  @IsOptional()
  status?: InvitationStatus;

  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsOptional()
  limit?: number = 20;
}

// 邀请响应
export class InvitationResponseDto {
  id: string;
  email: string;
  role: TeamMemberRole;
  status: InvitationStatus;
  message?: string;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
  };
  expiresAt: Date;
  createdAt: Date;
}

// 批量邀请结果
export class BulkInviteResultDto {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    email: string;
    success: boolean;
    invitationId?: string;
    error?: string;
  }>;
}

// 邀请链接
export class InviteLinkDto {
  @ApiProperty({ description: '角色', enum: TeamMemberRole })
  @IsEnum(TeamMemberRole)
  @IsOptional()
  role?: TeamMemberRole = TeamMemberRole.MEMBER;

  @ApiProperty({ description: '过期时间（天）', required: false })
  @IsOptional()
  expiresInDays?: number = 7;

  @ApiProperty({ description: '最大使用次数', required: false })
  @IsOptional()
  maxUses?: number;
}
