import { IsString, IsUrl, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FetchPreviewDto {
  @ApiProperty({
    description: 'URL to fetch preview from',
    example: 'https://example.com/article',
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Force refresh even if cached',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

export class UpdatePreviewDto {
  @ApiPropertyOptional({ description: 'Custom title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Custom description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Custom image URL' })
  @IsOptional()
  @IsString()
  image?: string;
}

export class PreviewResponseDto {
  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiPropertyOptional()
  favicon?: string;

  @ApiPropertyOptional()
  siteName?: string;

  @ApiPropertyOptional()
  type?: string;

  @ApiProperty()
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    imageWidth?: number;
    imageHeight?: number;
    url?: string;
    type?: string;
    siteName?: string;
    locale?: string;
  };

  @ApiProperty()
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
  };
}
