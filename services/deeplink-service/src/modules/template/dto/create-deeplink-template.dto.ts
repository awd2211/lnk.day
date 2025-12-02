import { IsString, IsOptional, IsBoolean, IsObject, IsNumber, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IOSConfig, AndroidConfig, SocialMetadata } from '../../deeplink/entities/deeplink.entity';

export class CreateDeepLinkTemplateDto {
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

  @ApiPropertyOptional({ description: 'iOS 配置' })
  @IsOptional()
  @IsObject()
  iosConfig?: IOSConfig;

  @ApiPropertyOptional({ description: 'Android 配置' })
  @IsOptional()
  @IsObject()
  androidConfig?: AndroidConfig;

  @ApiPropertyOptional({ description: '回退 URL' })
  @IsOptional()
  @IsString()
  fallbackUrl?: string;

  @ApiPropertyOptional({ description: '桌面端 URL' })
  @IsOptional()
  @IsString()
  desktopUrl?: string;

  @ApiPropertyOptional({ description: '社交媒体元数据' })
  @IsOptional()
  @IsObject()
  socialMetadata?: SocialMetadata;

  @ApiPropertyOptional({ description: '延迟深度链接', default: false })
  @IsOptional()
  @IsBoolean()
  deferredDeepLinking?: boolean;

  @ApiPropertyOptional({ description: '归因窗口（小时）', default: 24 })
  @IsOptional()
  @IsNumber()
  attributionWindow?: number;

  @ApiPropertyOptional({ description: '自定义数据' })
  @IsOptional()
  @IsObject()
  customData?: Record<string, any>;
}
