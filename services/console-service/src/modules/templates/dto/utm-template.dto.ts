import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UTMTemplateCategory } from '../entities/utm-template-preset.entity';

export class CreateUTMTemplateDto {
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

  @ApiPropertyOptional({ enum: ['advertising', 'social', 'email', 'affiliate', 'content', 'other'] })
  @IsOptional()
  @IsEnum(['advertising', 'social', 'email', 'affiliate', 'content', 'other'])
  category?: UTMTemplateCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;

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
  term?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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

export class UpdateUTMTemplateDto extends PartialType(CreateUTMTemplateDto) {}
