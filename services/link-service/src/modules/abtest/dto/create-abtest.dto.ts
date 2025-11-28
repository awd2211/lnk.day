import { IsString, IsArray, IsOptional, IsUUID, ValidateNested, IsNumber, Min, Max, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ABTestMetric } from '../abtest.entity';

class VariantDto {
  @ApiProperty({ description: '变体名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '目标 URL' })
  @IsString()
  targetUrl: string;

  @ApiProperty({ description: '流量百分比 (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficPercentage: number;
}

export class CreateABTestDto {
  @ApiProperty({ description: '测试名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '测试描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '链接 ID' })
  @IsUUID()
  linkId: string;

  @ApiProperty({ description: '测试变体', type: [VariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];

  @ApiPropertyOptional({ description: '追踪目标 (如: purchase, signup)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trackingGoals?: string[];

  // New settings fields
  @ApiPropertyOptional({ description: '最小样本量', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  minimumSampleSize?: number;

  @ApiPropertyOptional({ description: '置信度 (0.90, 0.95, 0.99)', default: 0.95 })
  @IsOptional()
  @IsNumber()
  confidenceLevel?: number;

  @ApiPropertyOptional({ description: '主要指标', enum: ABTestMetric })
  @IsOptional()
  @IsEnum(ABTestMetric)
  primaryMetric?: ABTestMetric;

  @ApiPropertyOptional({ description: '达到显著性时自动完成', default: true })
  @IsOptional()
  @IsBoolean()
  autoComplete?: boolean;

  @ApiPropertyOptional({ description: '自动选择优胜者', default: true })
  @IsOptional()
  @IsBoolean()
  autoSelectWinner?: boolean;

  @ApiPropertyOptional({ description: '最大持续天数' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDuration?: number;

  @ApiPropertyOptional({ description: '最小转化数', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  minConversions?: number;

  @ApiPropertyOptional({ description: '流量分配方式', enum: ['equal', 'weighted', 'bandit'] })
  @IsOptional()
  @IsString()
  trafficAllocationMethod?: 'equal' | 'weighted' | 'bandit';

  @ApiPropertyOptional({ description: '计划结束时间' })
  @IsOptional()
  @IsDateString()
  scheduledEndDate?: string;

  @ApiPropertyOptional({ description: '关联的营销活动 ID' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
