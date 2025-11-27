import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class UtmParamsDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

class GeoTargetDto {
  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsUrl()
  targetUrl: string;
}

class DeviceTargetDto {
  @IsString()
  deviceType: string;

  @IsUrl()
  targetUrl: string;
}

class TimeTargetDto {
  @IsString()
  startDate: string; // YYYY-MM-DD

  @IsString()
  endDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  startTime?: string; // HH:MM

  @IsOptional()
  @IsString()
  endTime?: string; // HH:MM

  @IsOptional()
  @IsString()
  timezone?: string; // e.g. "Asia/Shanghai"

  @IsUrl()
  targetUrl: string;
}

class LinkSettingsDto {
  @IsOptional()
  @IsBoolean()
  passwordProtected?: boolean;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GeoTargetDto)
  geoTargeting?: GeoTargetDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeviceTargetDto)
  deviceTargeting?: DeviceTargetDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TimeTargetDto)
  timeTargeting?: TimeTargetDto[];

  @IsOptional()
  @IsBoolean()
  cloaking?: boolean;
}

export class CreateLinkDto {
  @ApiProperty({ example: 'https://example.com/long-url' })
  @IsUrl()
  originalUrl: string;

  @ApiProperty({ required: false, example: 'my-link' })
  @IsOptional()
  @IsString()
  customSlug?: string;

  @ApiProperty({ required: false, example: 'lnk.day' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UtmParamsDto)
  utmParams?: UtmParamsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LinkSettingsDto)
  settings?: LinkSettingsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  expiresAt?: Date;
}
