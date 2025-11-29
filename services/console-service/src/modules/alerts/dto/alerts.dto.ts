import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertSeverity, AlertStatus } from '../entities/alert.entity';
import { RuleType, RuleConditionOperator, RuleCondition } from '../entities/alert-rule.entity';

// Alert DTOs
export class QueryAlertsDto {
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

  @ApiPropertyOptional({ description: '严重程度', enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: '状态', enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({ description: '来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  category?: string;

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
}

export class AcknowledgeAlertDto {
  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ResolveAlertDto {
  @ApiProperty({ description: '解决说明' })
  @IsString()
  resolution: string;
}

// Alert Rule DTOs
export class RuleConditionDto {
  @ApiProperty({ description: '监控指标' })
  @IsString()
  metric: string;

  @ApiProperty({ description: '比较操作符', enum: RuleConditionOperator })
  @IsEnum(RuleConditionOperator)
  operator: RuleConditionOperator;

  @ApiProperty({ description: '阈值' })
  value: number | string;

  @ApiPropertyOptional({ description: '持续时间（秒）' })
  @IsOptional()
  @IsNumber()
  duration?: number;
}

export class CreateAlertRuleDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '规则类型', enum: RuleType })
  @IsEnum(RuleType)
  type: RuleType;

  @ApiPropertyOptional({ description: '来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: '条件', type: [RuleConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions: RuleConditionDto[];

  @ApiPropertyOptional({ description: '严重程度', enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '冷却时间（秒）', default: 300 })
  @IsOptional()
  @IsNumber()
  cooldownSeconds?: number;

  @ApiPropertyOptional({ description: '通知渠道' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationChannels?: string[];

  @ApiPropertyOptional({ description: '通知配置' })
  @IsOptional()
  notificationConfig?: Record<string, any>;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional({ description: '规则名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '规则类型', enum: RuleType })
  @IsOptional()
  @IsEnum(RuleType)
  type?: RuleType;

  @ApiPropertyOptional({ description: '来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '条件', type: [RuleConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions?: RuleConditionDto[];

  @ApiPropertyOptional({ description: '严重程度', enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '冷却时间（秒）' })
  @IsOptional()
  @IsNumber()
  cooldownSeconds?: number;

  @ApiPropertyOptional({ description: '通知渠道' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationChannels?: string[];

  @ApiPropertyOptional({ description: '通知配置' })
  @IsOptional()
  notificationConfig?: Record<string, any>;
}

export class QueryAlertRulesDto {
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

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '规则类型', enum: RuleType })
  @IsOptional()
  @IsEnum(RuleType)
  type?: RuleType;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;
}
