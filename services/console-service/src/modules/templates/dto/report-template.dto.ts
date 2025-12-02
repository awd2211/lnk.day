import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ReportTemplateCategory } from '../entities/report-template-preset.entity';

export class CreateReportTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: ['traffic', 'conversion', 'engagement', 'comparison', 'custom'] })
  @IsOptional()
  @IsEnum(['traffic', 'conversion', 'engagement', 'comparison', 'custom'])
  category?: ReportTemplateCategory;

  @ApiProperty({ type: [String] })
  @IsArray()
  metrics: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  dimensions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiProperty()
  @IsObject()
  dateRange: {
    type: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_12_months' | 'custom';
    startDate?: string;
    endDate?: string;
    compareWithPrevious?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  limitResults?: number;

  @ApiPropertyOptional({ enum: ['pdf', 'csv', 'excel', 'json'] })
  @IsOptional()
  @IsEnum(['pdf', 'csv', 'excel', 'json'])
  format?: 'pdf' | 'csv' | 'excel' | 'json';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customBranding?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
    recipients: string[];
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateReportTemplateDto extends PartialType(CreateReportTemplateDto) {}
