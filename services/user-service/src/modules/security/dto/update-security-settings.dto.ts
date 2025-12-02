import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class UpdateSecuritySettingsDto {
  // ========== 密码策略 ==========
  @ApiProperty({ description: '最小密码长度', required: false })
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(32)
  minPasswordLength?: number;

  @ApiProperty({ description: '是否要求大写字母', required: false })
  @IsOptional()
  @IsBoolean()
  requireUppercase?: boolean;

  @ApiProperty({ description: '是否要求小写字母', required: false })
  @IsOptional()
  @IsBoolean()
  requireLowercase?: boolean;

  @ApiProperty({ description: '是否要求数字', required: false })
  @IsOptional()
  @IsBoolean()
  requireNumbers?: boolean;

  @ApiProperty({ description: '是否要求特殊字符', required: false })
  @IsOptional()
  @IsBoolean()
  requireSpecialChars?: boolean;

  @ApiProperty({ description: '密码过期天数 (0 表示不过期)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  passwordExpiryDays?: number;

  @ApiProperty({ description: '防止重复使用最近 N 个密码', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  preventPasswordReuse?: number;

  // ========== 登录安全 ==========
  @ApiProperty({ description: '最大登录尝试次数', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxLoginAttempts?: number;

  @ApiProperty({ description: '账户锁定时长（分钟）', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440) // 最多 24 小时
  lockoutDuration?: number;

  @ApiProperty({ description: '会话超时时间（分钟）', required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(10080) // 最多 7 天
  sessionTimeout?: number;

  @ApiProperty({ description: '是否强制启用 MFA', required: false })
  @IsOptional()
  @IsBoolean()
  requireMfa?: boolean;

  // ========== IP 限制 ==========
  @ApiProperty({ description: '是否启用 IP 白名单', required: false })
  @IsOptional()
  @IsBoolean()
  ipWhitelistEnabled?: boolean;

  @ApiProperty({ description: '是否启用 IP 黑名单', required: false })
  @IsOptional()
  @IsBoolean()
  ipBlacklistEnabled?: boolean;

  @ApiProperty({ description: '每分钟请求限制', required: false })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(10000)
  rateLimit?: number;

  // ========== 其他设置 ==========
  @ApiProperty({ description: '审计日志保留天数', required: false })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(365)
  auditLogRetentionDays?: number;

  @ApiProperty({ description: '是否启用敏感数据掩码', required: false })
  @IsOptional()
  @IsBoolean()
  sensitiveDataMasking?: boolean;

  @ApiProperty({ description: '是否强制 HTTPS', required: false })
  @IsOptional()
  @IsBoolean()
  forceHttps?: boolean;
}
