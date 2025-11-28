import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsUrl,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RuleType,
  RuleOperator,
  GeoCondition,
  DeviceCondition,
  TimeCondition,
  LanguageCondition,
  ReferrerCondition,
  QueryParamCondition,
} from '../entities/redirect-rule.entity';

// Geo Condition DTO
export class GeoConditionDto implements GeoCondition {
  @ApiPropertyOptional({ example: ['CN', 'US', 'JP'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @ApiPropertyOptional({ example: ['CA', 'NY'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({ example: ['Beijing', 'Shanghai'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({ example: ['AS', 'EU'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  continents?: string[];

  @ApiPropertyOptional({ example: ['RU'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeCountries?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeRegions?: string[];
}

// Device Condition DTO
export class DeviceConditionDto implements DeviceCondition {
  @ApiPropertyOptional({ example: ['mobile', 'tablet'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deviceTypes?: ('desktop' | 'mobile' | 'tablet')[];

  @ApiPropertyOptional({ example: ['iOS', 'Android'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingSystems?: string[];

  @ApiPropertyOptional({ example: ['Chrome', 'Safari'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  browsers?: string[];

  @ApiPropertyOptional({ example: '14.0' })
  @IsOptional()
  @IsString()
  minOsVersion?: string;

  @ApiPropertyOptional({ example: '17.0' })
  @IsOptional()
  @IsString()
  maxOsVersion?: string;
}

// Time Condition DTO
export class TimeConditionDto implements TimeCondition {
  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], description: '0=Sunday, 6=Saturday' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: 'Asia/Shanghai' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

// Language Condition DTO
export class LanguageConditionDto implements LanguageCondition {
  @ApiPropertyOptional({ example: ['zh', 'en', 'ja'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeLanguages?: string[];
}

// Referrer Condition DTO
export class ReferrerConditionDto implements ReferrerCondition {
  @ApiPropertyOptional({ example: ['google.com', 'facebook.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeDomains?: string[];

  @ApiPropertyOptional({ example: 'newsletter' })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ example: 'email' })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional({ example: 'winter_sale' })
  @IsOptional()
  @IsString()
  utmCampaign?: string;
}

// Query Param Condition DTO
export class QueryParamConditionDto implements QueryParamCondition {
  @ApiProperty({ example: 'ref' })
  @IsString()
  paramName: string;

  @ApiProperty({ enum: RuleOperator, example: RuleOperator.EQUALS })
  @IsEnum(RuleOperator)
  operator: RuleOperator;

  @ApiProperty({ example: 'affiliate123' })
  @IsString()
  value: string;
}

// Rule Conditions DTO
export class RuleConditionsDto {
  @ApiPropertyOptional({ type: GeoConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoConditionDto)
  geo?: GeoConditionDto;

  @ApiPropertyOptional({ type: DeviceConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceConditionDto)
  device?: DeviceConditionDto;

  @ApiPropertyOptional({ type: TimeConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeConditionDto)
  time?: TimeConditionDto;

  @ApiPropertyOptional({ type: LanguageConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LanguageConditionDto)
  language?: LanguageConditionDto;

  @ApiPropertyOptional({ type: ReferrerConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReferrerConditionDto)
  referrer?: ReferrerConditionDto;

  @ApiPropertyOptional({ type: [QueryParamConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryParamConditionDto)
  queryParams?: QueryParamConditionDto[];
}

// Create Rule DTO
export class CreateRedirectRuleDto {
  @ApiProperty({ example: '中国用户跳转' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '将中国大陆用户重定向到本地化页面' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://cn.example.com/landing' })
  @IsUrl()
  targetUrl: string;

  @ApiProperty({ enum: RuleType, isArray: true, example: [RuleType.GEO] })
  @IsArray()
  @IsEnum(RuleType, { each: true })
  @ArrayMinSize(1)
  types: RuleType[];

  @ApiProperty({ type: RuleConditionsDto })
  @ValidateNested()
  @Type(() => RuleConditionsDto)
  conditions: RuleConditionsDto;

  @ApiPropertyOptional({ example: 10, description: '优先级，数值越大越先匹配' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

// Update Rule DTO
export class UpdateRedirectRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  targetUrl?: string;

  @ApiPropertyOptional({ enum: RuleType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(RuleType, { each: true })
  types?: RuleType[];

  @ApiPropertyOptional({ type: RuleConditionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConditionsDto)
  conditions?: RuleConditionsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

// Response DTO
export class RedirectRuleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  linkId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  targetUrl: string;

  @ApiProperty({ enum: RuleType, isArray: true })
  types: RuleType[];

  @ApiProperty()
  conditions: RuleConditionsDto;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  matchCount: number;

  @ApiPropertyOptional()
  lastMatchedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Evaluate Request DTO (for testing rules)
export class EvaluateRulesDto {
  @ApiPropertyOptional({ example: 'CN' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Beijing' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Beijing' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'mobile' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ example: 'iOS' })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiPropertyOptional({ example: '17.0' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ example: 'Safari' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ example: 'zh-CN' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'https://google.com' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ example: { ref: 'affiliate123' } })
  @IsOptional()
  queryParams?: Record<string, string>;

  @ApiPropertyOptional({ example: '2024-06-15T14:30:00Z' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}
