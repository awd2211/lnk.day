import { IsBoolean, IsNumber, IsOptional, IsArray, IsIP, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserSecuritySettingsDto {
  @ApiPropertyOptional({ description: '登录通知' })
  @IsOptional()
  @IsBoolean()
  loginNotifications?: boolean;

  @ApiPropertyOptional({ description: '可疑活动警报' })
  @IsOptional()
  @IsBoolean()
  suspiciousActivityAlerts?: boolean;

  @ApiPropertyOptional({ description: '会话超时天数 (0=永不过期)', minimum: 0, maximum: 365 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  sessionTimeoutDays?: number;

  @ApiPropertyOptional({ description: '启用 IP 白名单' })
  @IsOptional()
  @IsBoolean()
  ipWhitelistEnabled?: boolean;

  @ApiPropertyOptional({ description: 'IP 白名单列表', type: [String] })
  @IsOptional()
  @IsArray()
  ipWhitelist?: string[];
}
