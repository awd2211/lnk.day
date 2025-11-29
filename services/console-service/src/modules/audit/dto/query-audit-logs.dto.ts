import { IsOptional, IsString, IsInt, Min, IsDateString, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, ActorType, AuditStatus } from '../entities/audit-log.entity';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', minimum: 1, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '操作类型' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: '操作者类型', enum: ActorType })
  @IsOptional()
  @IsEnum(ActorType)
  actorType?: ActorType;

  @ApiPropertyOptional({ description: '操作者ID' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: '目标类型' })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: '目标ID' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: '状态', enum: AuditStatus })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'IP地址' })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

export class ExportAuditLogsDto extends QueryAuditLogsDto {
  @ApiPropertyOptional({ description: '导出格式', default: 'csv' })
  @IsOptional()
  @IsString()
  format?: 'csv' | 'json' = 'csv';
}

export class CreateAuditLogDto {
  @IsString()
  action: string;

  @IsEnum(ActorType)
  actorType: ActorType;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  actorName?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  targetName?: string;

  @IsOptional()
  details?: Record<string, any>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
