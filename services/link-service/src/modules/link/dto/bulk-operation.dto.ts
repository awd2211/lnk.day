import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LinkStatus } from '../entities/link.entity';

export enum BulkAction {
  DELETE = 'delete',
  ARCHIVE = 'archive',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  ADD_TAGS = 'add_tags',
  REMOVE_TAGS = 'remove_tags',
}

export class BulkOperationDto {
  @ApiProperty({ description: '链接 ID 列表', example: ['uuid1', 'uuid2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];

  @ApiProperty({ description: '批量操作类型', enum: BulkAction })
  @IsEnum(BulkAction)
  @IsNotEmpty()
  action: BulkAction;

  @ApiProperty({ description: '标签 (用于 add_tags/remove_tags 操作)', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BulkCreateDto {
  @ApiProperty({
    description: '批量创建的链接列表',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        originalUrl: { type: 'string' },
        title: { type: 'string' },
        customSlug: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @IsArray()
  @ArrayMinSize(1)
  links: Array<{
    originalUrl: string;
    title?: string;
    customSlug?: string;
    tags?: string[];
  }>;
}
