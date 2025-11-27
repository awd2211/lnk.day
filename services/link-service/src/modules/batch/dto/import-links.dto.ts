import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  ArrayMaxSize,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportLinkItemDto {
  @ApiProperty({ example: 'https://example.com/page' })
  @IsUrl()
  originalUrl: string;

  @ApiPropertyOptional({ example: 'my-custom-slug' })
  @IsOptional()
  @IsString()
  customSlug?: string;

  @ApiPropertyOptional({ example: 'My Link Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: ['marketing', 'blog'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'campaign-2024' })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ example: 'email' })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional({ example: 'newsletter' })
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiPropertyOptional({ example: 'header-link' })
  @IsOptional()
  @IsString()
  utmContent?: string;

  @ApiPropertyOptional({ example: 'keyword1' })
  @IsOptional()
  @IsString()
  utmTerm?: string;

  @ApiPropertyOptional({ example: 'folder-uuid' })
  @IsOptional()
  @IsString()
  folderId?: string;
}

export class ImportLinksDto {
  @ApiProperty({ type: [ImportLinkItemDto], maxItems: 1000 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportLinkItemDto)
  @ArrayMaxSize(1000)
  links: ImportLinkItemDto[];

  @ApiPropertyOptional({
    default: false,
    description: 'Skip duplicates instead of failing',
  })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;
}

export class ImportResultDto {
  @ApiProperty()
  totalProcessed: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failedCount: number;

  @ApiProperty()
  skippedCount: number;

  @ApiProperty({ type: [Object] })
  createdLinks: Array<{
    originalUrl: string;
    shortUrl: string;
    shortCode: string;
  }>;

  @ApiProperty({ type: [Object] })
  errors: Array<{
    row: number;
    originalUrl: string;
    error: string;
  }>;
}
