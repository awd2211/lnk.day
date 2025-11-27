import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamMemberRole } from '../entities/team-member.entity';

export class UpdateMemberDto {
  @ApiProperty({
    description: '成员角色',
    enum: TeamMemberRole,
  })
  @IsEnum(TeamMemberRole)
  @IsNotEmpty()
  role: TeamMemberRole;
}
