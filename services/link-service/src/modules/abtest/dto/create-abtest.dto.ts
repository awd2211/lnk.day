import { IsString, IsArray, IsOptional, IsUUID, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class VariantDto {
  @ApiProperty({ description: '变体名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '目标 URL' })
  @IsString()
  targetUrl: string;

  @ApiProperty({ description: '流量百分比 (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficPercentage: number;
}

export class CreateABTestDto {
  @ApiProperty({ description: '测试名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '测试描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '链接 ID' })
  @IsUUID()
  linkId: string;

  @ApiProperty({ description: '测试变体', type: [VariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];

  @ApiPropertyOptional({ description: '追踪目标 (如: purchase, signup)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trackingGoals?: string[];
}
