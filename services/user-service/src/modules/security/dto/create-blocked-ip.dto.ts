import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, Matches } from 'class-validator';

export class CreateBlockedIpDto {
  @ApiProperty({
    description: 'IP 地址或 CIDR 格式',
    example: '192.168.1.1 或 192.168.1.0/24',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:3[0-2]|[12]?[0-9]))?$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(?:\/(?:12[0-8]|1[01][0-9]|[1-9]?[0-9]))?$/,
    { message: 'IP 地址格式无效' },
  )
  ip: string;

  @ApiProperty({ description: '封禁原因' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: '是否永久封禁', default: false })
  @IsOptional()
  @IsBoolean()
  permanent?: boolean;

  @ApiProperty({ description: '过期时间 (ISO 格式)', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
