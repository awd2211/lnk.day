import { IsEnum, IsOptional, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConsentType } from '../entities/user-consent.entity';
import { DataRequestType } from '../entities/data-request.entity';

// 更新同意状态
export class UpdateConsentDto {
  @ApiProperty({ description: '同意类型', enum: ConsentType })
  @IsEnum(ConsentType)
  type: ConsentType;

  @ApiProperty({ description: '是否同意' })
  @IsBoolean()
  granted: boolean;
}

// 批量更新同意
export class BulkUpdateConsentDto {
  @ApiProperty({ description: '同意列表', type: [UpdateConsentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateConsentDto)
  consents: UpdateConsentDto[];
}

// 创建数据请求
export class CreateDataRequestDto {
  @ApiProperty({ description: '请求类型', enum: DataRequestType })
  @IsEnum(DataRequestType)
  type: DataRequestType;

  @ApiProperty({ description: '请求原因（可选）', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

// 取消删除请求
export class CancelDeletionDto {
  @ApiProperty({ description: '确认取消' })
  @IsBoolean()
  confirm: boolean;
}

// 同意响应
export class ConsentResponseDto {
  type: ConsentType;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  version?: string;
}

// 数据请求响应
export class DataRequestResponseDto {
  id: string;
  type: DataRequestType;
  status: string;
  reason?: string;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  coolingPeriodEndsAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

// 隐私设置概览
export class PrivacyOverviewDto {
  consents: ConsentResponseDto[];
  pendingRequests: DataRequestResponseDto[];
  scheduledDeletion?: {
    requestId: string;
    scheduledAt: Date;
  };
}

// 数据导出内容
export class ExportedDataDto {
  exportDate: Date;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  };
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  links: Array<{
    id: string;
    shortCode: string;
    originalUrl: string;
    createdAt: Date;
    clicks: number;
  }>;
  consents: ConsentResponseDto[];
  activityLog: Array<{
    action: string;
    timestamp: Date;
    ipAddress?: string;
  }>;
}
