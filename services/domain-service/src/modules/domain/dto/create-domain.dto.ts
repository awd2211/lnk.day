import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Matches,
  ValidateNested,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DomainType } from '../entities/custom-domain.entity';

export class DomainSettingsDto {
  @ApiPropertyOptional({ example: 'https://example.com/404' })
  @IsOptional()
  @IsUrl()
  fallbackUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  forceHttps?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hsts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customNotFoundPage?: string;
}

export class CreateDomainDto {
  @ApiProperty({
    example: 'go.mycompany.com',
    description: 'The custom domain to add',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, {
    message: 'Invalid domain format',
  })
  domain: string;

  @ApiPropertyOptional({ enum: DomainType, default: DomainType.REDIRECT })
  @IsOptional()
  @IsEnum(DomainType)
  type?: DomainType;

  @ApiPropertyOptional({ type: DomainSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DomainSettingsDto)
  settings?: DomainSettingsDto;
}

export class UpdateDomainDto {
  @ApiPropertyOptional({ enum: DomainType })
  @IsOptional()
  @IsEnum(DomainType)
  type?: DomainType;

  @ApiPropertyOptional({ type: DomainSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DomainSettingsDto)
  settings?: DomainSettingsDto;
}
