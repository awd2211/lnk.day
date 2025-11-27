import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamMemberRole } from '../entities/team-member.entity';

export class InviteMemberDto {
  @ApiProperty({ description: '被邀请用户的邮箱', example: 'member@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '成员角色',
    enum: TeamMemberRole,
    default: TeamMemberRole.MEMBER,
  })
  @IsEnum(TeamMemberRole)
  @IsOptional()
  role?: TeamMemberRole = TeamMemberRole.MEMBER;
}
