import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

class UtmParamsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  term?: string;
}

class GeoTargetingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiProperty()
  @IsString()
  targetUrl: string;
}

class DeviceTargetingDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  devices: string[];

  @ApiProperty()
  @IsString()
  targetUrl: string;
}

class TimeScheduleDto {
  @ApiProperty()
  @IsArray()
  @IsNumber({}, { each: true })
  days: number[];

  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;

  @ApiProperty()
  @IsString()
  targetUrl: string;
}

class TimeTargetingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeScheduleDto)
  schedule?: TimeScheduleDto[];
}

export class CreateLinkTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '颜色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '默认域名' })
  @IsOptional()
  @IsString()
  defaultDomain?: string;

  @ApiPropertyOptional({ description: '默认文件夹ID' })
  @IsOptional()
  @IsString()
  defaultFolderId?: string;

  @ApiPropertyOptional({ description: '默认标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultTags?: string[];

  @ApiPropertyOptional({ description: '默认UTM参数', type: UtmParamsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UtmParamsDto)
  defaultUtmParams?: UtmParamsDto;

  @ApiPropertyOptional({ description: '默认地理定向', type: [GeoTargetingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoTargetingDto)
  defaultGeoTargeting?: GeoTargetingDto[];

  @ApiPropertyOptional({ description: '默认设备定向', type: [DeviceTargetingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceTargetingDto)
  defaultDeviceTargeting?: DeviceTargetingDto[];

  @ApiPropertyOptional({ description: '默认时间定向', type: TimeTargetingDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TimeTargetingDto)
  defaultTimeTargeting?: TimeTargetingDto;

  @ApiPropertyOptional({ description: '默认密码保护' })
  @IsOptional()
  @IsBoolean()
  defaultPasswordProtected?: boolean;

  @ApiPropertyOptional({ description: '默认密码' })
  @IsOptional()
  @IsString()
  defaultPassword?: string;

  @ApiPropertyOptional({ description: '默认过期天数' })
  @IsOptional()
  @IsNumber()
  defaultExpiresInDays?: number;
}

export class UpdateLinkTemplateDto extends PartialType(CreateLinkTemplateDto) {
  @ApiPropertyOptional({ description: '是否收藏' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}

export class CreateLinkFromTemplateDto {
  @ApiProperty({ description: '模板ID' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ description: '原始URL' })
  @IsString()
  originalUrl: string;

  @ApiPropertyOptional({ description: '自定义短码' })
  @IsOptional()
  @IsString()
  customSlug?: string;

  @ApiPropertyOptional({ description: '标题（覆盖模板默认值）' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '额外标签（与模板默认标签合并）' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalTags?: string[];

  @ApiPropertyOptional({ description: 'UTM参数覆盖' })
  @IsOptional()
  @IsObject()
  utmOverrides?: Partial<UtmParamsDto>;
}

export class LinkTemplateQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '只显示收藏' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  favoritesOnly?: boolean;

  @ApiPropertyOptional({ description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
