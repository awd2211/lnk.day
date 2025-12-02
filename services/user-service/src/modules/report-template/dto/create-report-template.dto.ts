import { IsString, IsOptional, IsArray, IsObject, IsEnum, IsBoolean, IsNumber, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DateRangeDto {
  @ApiProperty({ description: '时间范围类型', enum: ['last_7_days', 'last_30_days', 'last_90_days', 'last_12_months', 'custom'] })
  @IsEnum(['last_7_days', 'last_30_days', 'last_90_days', 'last_12_months', 'custom'])
  type: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_12_months' | 'custom';

  @ApiPropertyOptional({ description: '开始日期 (ISO 格式)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (ISO 格式)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '是否与上一期对比' })
  @IsOptional()
  @IsBoolean()
  compareWithPrevious?: boolean;
}

export class ScheduleDto {
  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: '频率', enum: ['daily', 'weekly', 'monthly'] })
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: '星期几 (0-6)' })
  @IsOptional()
  @IsNumber()
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: '每月几号 (1-31)' })
  @IsOptional()
  @IsNumber()
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: '时间 (HH:mm)' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: '时区' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: '收件人邮箱列表' })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];
}

export class CreateReportTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '颜色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: '分类',
    enum: ['traffic', 'conversion', 'engagement', 'comparison', 'custom'],
    default: 'custom'
  })
  @IsOptional()
  @IsEnum(['traffic', 'conversion', 'engagement', 'comparison', 'custom'])
  category?: 'traffic' | 'conversion' | 'engagement' | 'comparison' | 'custom';

  @ApiProperty({ description: '指标列表' })
  @IsArray()
  @IsString({ each: true })
  metrics: string[];

  @ApiPropertyOptional({ description: '维度列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dimensions?: string[];

  @ApiPropertyOptional({ description: '筛选条件' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiProperty({ description: '时间范围' })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange: DateRangeDto;

  @ApiPropertyOptional({ description: '分组字段' })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional({ description: '排序字段' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: '结果数量限制' })
  @IsOptional()
  @IsNumber()
  limitResults?: number;

  @ApiPropertyOptional({ description: '导出格式', enum: ['pdf', 'csv', 'excel', 'json'] })
  @IsOptional()
  @IsEnum(['pdf', 'csv', 'excel', 'json'])
  format?: 'pdf' | 'csv' | 'excel' | 'json';

  @ApiPropertyOptional({ description: '是否包含图表' })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional({ description: '是否包含摘要' })
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean;

  @ApiPropertyOptional({ description: '自定义品牌 Logo URL' })
  @IsOptional()
  @IsString()
  customBranding?: string;

  @ApiPropertyOptional({ description: '定时发送配置' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule?: ScheduleDto;
}
