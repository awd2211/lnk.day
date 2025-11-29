import { IsEnum, IsOptional, IsString, IsNumber, IsBoolean, Min, Max, IsUUID, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlagReason, FlagSeverity, FlagStatus } from '../entities/flagged-link.entity';

export class QueryFlaggedLinksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: FlagStatus })
  @IsOptional()
  @IsEnum(FlagStatus)
  status?: FlagStatus;

  @ApiPropertyOptional({ enum: FlagReason })
  @IsOptional()
  @IsEnum(FlagReason)
  reason?: FlagReason;

  @ApiPropertyOptional({ enum: FlagSeverity })
  @IsOptional()
  @IsEnum(FlagSeverity)
  severity?: FlagSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;
}

export class CreateReportDto {
  @ApiProperty()
  @IsUUID()
  linkId: string;

  @ApiProperty({ enum: FlagReason })
  @IsEnum(FlagReason)
  reason: FlagReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reporterEmail?: string;
}

export class ApproveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class BlockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blockUser?: boolean;
}

export class BulkApproveDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkBlockDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blockUsers?: boolean;
}

export class UpdateModerationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoDetectionEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoBlockPhishing?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoBlockMalware?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  autoBlockThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  severityUpgradeThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dailySummaryEnabled?: boolean;
}

export class ModerationStatsDto {
  pendingReview: number;
  blockedToday: number;
  approvedToday: number;
  totalReports: number;
  autoBlocked: number;
  byReason: Array<{ reason: string; count: number }>;
}
