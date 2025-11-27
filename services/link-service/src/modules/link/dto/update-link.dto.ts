import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional, IsArray, IsEnum } from 'class-validator';
import { LinkStatus } from '../entities/link.entity';

export class UpdateLinkDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  originalUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false, enum: LinkStatus })
  @IsOptional()
  @IsEnum(LinkStatus)
  status?: LinkStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  expiresAt?: Date;
}
