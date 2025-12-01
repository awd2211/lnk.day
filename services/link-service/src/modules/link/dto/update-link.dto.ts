import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional, IsArray, IsEnum, IsUUID } from 'class-validator';
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

  @ApiProperty({ required: false, description: '文件夹ID，设为 null 可移动到根目录' })
  @IsOptional()
  @IsString()
  folderId?: string | null;

  @ApiProperty({ required: false, enum: LinkStatus })
  @IsOptional()
  @IsEnum(LinkStatus)
  status?: LinkStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  expiresAt?: Date;
}
