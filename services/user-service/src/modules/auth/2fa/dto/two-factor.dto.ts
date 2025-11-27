import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class Enable2FAResponseDto {
  @ApiProperty({ description: 'TOTP secret key' })
  secret: string;

  @ApiProperty({ description: 'QR code URL for authenticator apps' })
  qrCodeUrl: string;

  @ApiProperty({ description: 'OTP auth URL' })
  otpAuthUrl: string;

  @ApiProperty({ type: [String], description: 'Backup codes' })
  backupCodes: string[];
}

export class Verify2FADto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class Disable2FADto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code or backup code' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class Verify2FALoginDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code or backup code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Temporary token from login' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;
}

export class TwoFactorStatusDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  backupCodesRemaining: number;

  @ApiProperty({ nullable: true })
  lastUsedAt: Date | null;
}

export class RegenerateBackupCodesDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}
