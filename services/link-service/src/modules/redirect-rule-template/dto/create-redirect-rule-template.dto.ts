import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsNumber, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RuleType, RuleConditions } from '../../redirect-rules/entities/redirect-rule.entity';

export class CreateRedirectRuleTemplateDto {
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

  @ApiPropertyOptional({ description: '分类', default: 'custom' })
  @IsOptional()
  @IsString()
  category?: 'ab_test' | 'geo' | 'device' | 'time' | 'language' | 'referrer' | 'custom';

  @ApiPropertyOptional({ description: '规则类型', type: [String], enum: RuleType })
  @IsOptional()
  @IsArray()
  types?: RuleType[];

  @ApiPropertyOptional({ description: '规则条件' })
  @IsOptional()
  @IsObject()
  conditions?: RuleConditions;

  @ApiPropertyOptional({ description: 'A/B 测试变体' })
  @IsOptional()
  @IsArray()
  abTestVariants?: Array<{
    name: string;
    url: string;
    weight: number;
  }>;

  @ApiPropertyOptional({ description: '地理位置规则预设' })
  @IsOptional()
  @IsArray()
  geoPresets?: Array<{
    name: string;
    countries?: string[];
    regions?: string[];
    cities?: string[];
    url: string;
  }>;

  @ApiPropertyOptional({ description: '设备规则预设' })
  @IsOptional()
  @IsArray()
  devicePresets?: Array<{
    name: string;
    deviceTypes?: ('desktop' | 'mobile' | 'tablet')[];
    operatingSystems?: string[];
    browsers?: string[];
    url: string;
  }>;

  @ApiPropertyOptional({ description: '时间规则预设' })
  @IsOptional()
  @IsArray()
  timePresets?: Array<{
    name: string;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
    timezone?: string;
    url: string;
  }>;

  @ApiPropertyOptional({ description: '默认目标 URL' })
  @IsOptional()
  @IsString()
  defaultTargetUrl?: string;

  @ApiPropertyOptional({ description: '默认优先级' })
  @IsOptional()
  @IsNumber()
  defaultPriority?: number;
}
