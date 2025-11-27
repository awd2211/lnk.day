import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsDateString, IsEnum } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export class ExportLinksQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;

  @ApiPropertyOptional({ example: 'folder-uuid' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ example: ['marketing', 'blog'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: ['originalUrl', 'shortCode', 'title', 'totalClicks', 'createdAt'],
    description: 'Fields to include in export',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}

export class ParsedCsvRow {
  originalUrl: string;
  customSlug?: string;
  title?: string;
  tags?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  folderId?: string;
}
