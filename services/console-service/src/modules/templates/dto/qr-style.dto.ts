import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QRStyleCategory, DotStyle, EyeStyle } from '../entities/qr-style-preset.entity';

class QRGradientDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty()
  @IsString()
  startColor: string;

  @ApiProperty()
  @IsString()
  endColor: string;

  @ApiProperty({ enum: ['vertical', 'horizontal', 'diagonal'] })
  @IsEnum(['vertical', 'horizontal', 'diagonal'])
  direction: 'vertical' | 'horizontal' | 'diagonal';
}

class QREyeStyleDto {
  @ApiProperty({ enum: ['square', 'circle', 'leaf', 'rounded'] })
  @IsEnum(['square', 'circle', 'leaf', 'rounded'])
  outer: EyeStyle;

  @ApiProperty({ enum: ['square', 'circle', 'leaf', 'rounded'] })
  @IsEnum(['square', 'circle', 'leaf', 'rounded'])
  inner: EyeStyle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}

class QRLogoPlaceholderDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ enum: ['small', 'medium', 'large'] })
  @IsEnum(['small', 'medium', 'large'])
  size: 'small' | 'medium' | 'large';
}

class QRBorderDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty()
  @IsString()
  color: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  width: number;

  @ApiProperty({ enum: ['solid', 'dashed', 'dotted'] })
  @IsEnum(['solid', 'dashed', 'dotted'])
  style: 'solid' | 'dashed' | 'dotted';
}

class QRStyleDto {
  @ApiProperty()
  @IsString()
  foregroundColor: string;

  @ApiProperty()
  @IsString()
  backgroundColor: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  cornerRadius?: number;

  @ApiPropertyOptional({
    enum: ['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'],
  })
  @IsOptional()
  @IsEnum(['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'])
  dotStyle?: DotStyle;

  @ApiPropertyOptional({ type: QRGradientDto })
  @IsOptional()
  @Type(() => QRGradientDto)
  gradient?: QRGradientDto;

  @ApiPropertyOptional({ type: QREyeStyleDto })
  @IsOptional()
  @Type(() => QREyeStyleDto)
  eyeStyle?: QREyeStyleDto;

  @ApiPropertyOptional({ type: QRLogoPlaceholderDto })
  @IsOptional()
  @Type(() => QRLogoPlaceholderDto)
  logoPlaceholder?: QRLogoPlaceholderDto;

  @ApiPropertyOptional({ type: QRBorderDto })
  @IsOptional()
  @Type(() => QRBorderDto)
  border?: QRBorderDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  quietZone?: number;
}

export class CreateQRStyleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['classic', 'modern', 'gradient', 'branded', 'artistic'] })
  @IsOptional()
  @IsEnum(['classic', 'modern', 'gradient', 'branded', 'artistic'])
  category?: QRStyleCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ type: QRStyleDto })
  @Type(() => QRStyleDto)
  style: QRStyleDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

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

export class UpdateQRStyleDto extends PartialType(CreateQRStyleDto) {}
