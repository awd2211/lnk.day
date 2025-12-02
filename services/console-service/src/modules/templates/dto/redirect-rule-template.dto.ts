import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RedirectRuleTemplateCategory } from '../entities/redirect-rule-template-preset.entity';

export class CreateRedirectRuleTemplateDto {
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

  @ApiPropertyOptional({ enum: ['ab_test', 'geo', 'device', 'time', 'custom'] })
  @IsOptional()
  @IsEnum(['ab_test', 'geo', 'device', 'time', 'custom'])
  category?: RedirectRuleTemplateCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  abTestVariants?: Array<{
    name: string;
    url: string;
    weight: number;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  geoPresets?: Array<{
    name: string;
    countries: string[];
    regions?: string[];
    url: string;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  devicePresets?: Array<{
    name: string;
    devices: string[];
    os?: string[];
    browsers?: string[];
    url: string;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  timePresets?: Array<{
    name: string;
    startTime: string;
    endTime: string;
    days: number[];
    timezone: string;
    url: string;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultUrl?: string;

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

export class UpdateRedirectRuleTemplateDto extends PartialType(CreateRedirectRuleTemplateDto) {}
