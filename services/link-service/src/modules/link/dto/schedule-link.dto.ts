import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScheduleAction {
  PUBLISH = 'publish',
  UNPUBLISH = 'unpublish',
  EXPIRE = 'expire',
}

export class ScheduleLinkDto {
  @ApiProperty({
    description: '计划动作',
    enum: ScheduleAction,
    example: ScheduleAction.PUBLISH,
  })
  @IsEnum(ScheduleAction)
  action: ScheduleAction;

  @ApiProperty({
    description: '计划执行时间 (ISO 8601)',
    example: '2025-01-15T10:00:00Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: '时区',
    example: 'Asia/Shanghai',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({
    description: '新的计划执行时间',
    example: '2025-01-20T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: '新的时区',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
