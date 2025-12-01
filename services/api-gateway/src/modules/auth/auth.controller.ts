import { Controller, Post, Body, Get, Delete, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;
}

class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

class Verify2FADto {
  @IsString()
  code: string;
}

class Disable2FADto {
  @IsString()
  code: string;
}

class RegenerateBackupCodesDto {
  @IsString()
  code: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  getCurrentUser(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.validateToken(token);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ========== 2FA Endpoints ==========

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get 2FA status' })
  get2FAStatus(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.get2FAStatus(token);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA (get secret and QR code)' })
  enable2FA(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.enable2FA(token);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and activate 2FA' })
  verify2FA(@Headers('authorization') auth: string, @Body() dto: Verify2FADto) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.verify2FA(token, dto.code);
  }

  @Delete('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  disable2FA(@Headers('authorization') auth: string, @Body() dto: Disable2FADto) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.disable2FA(token, dto.code);
  }

  @Post('2fa/regenerate-backup-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate backup codes' })
  regenerateBackupCodes(@Headers('authorization') auth: string, @Body() dto: RegenerateBackupCodesDto) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.regenerateBackupCodes(token, dto.code);
  }
}
