import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CloneLinkDto {
  @ApiPropertyOptional({
    description: '新的短链接代码，不填则自动生成',
    example: 'my-new-link',
  })
  @IsOptional()
  @IsString()
  newShortCode?: string;

  @ApiPropertyOptional({
    description: '新的标题',
    example: 'Cloned Link',
  })
  @IsOptional()
  @IsString()
  newTitle?: string;

  @ApiPropertyOptional({
    description: '是否复制 UTM 参数',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  copyUtmParams?: boolean;

  @ApiPropertyOptional({
    description: '是否复制设置（密码保护、地理定向等）',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  copySettings?: boolean;

  @ApiPropertyOptional({
    description: '是否复制标签',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  copyTags?: boolean;

  @ApiPropertyOptional({
    description: '目标文件夹 ID',
  })
  @IsOptional()
  @IsString()
  targetFolderId?: string;
}
