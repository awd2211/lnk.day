import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  Enable2FAResponseDto,
  Verify2FADto,
  Disable2FADto,
  TwoFactorStatusDto,
  RegenerateBackupCodesDto,
} from './dto/two-factor.dto';

@ApiTags('2fa')
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 2FA 状态' })
  @ApiResponse({ status: 200, type: TwoFactorStatusDto })
  async getStatus(@Headers('x-user-id') userId: string): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.getStatus(userId);
  }

  @Post('enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '启用 2FA（获取密钥和二维码）' })
  @ApiResponse({ status: 200, type: Enable2FAResponseDto })
  async enable2FA(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
  ): Promise<Enable2FAResponseDto> {
    return this.twoFactorService.enable2FA(userId, userEmail || `user-${userId}@lnk.day`);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '验证并激活 2FA' })
  @ApiResponse({ status: 200, description: '2FA 已激活' })
  async verify2FA(
    @Headers('x-user-id') userId: string,
    @Body() dto: Verify2FADto,
  ): Promise<{ success: boolean; message: string }> {
    await this.twoFactorService.verify2FA(userId, dto.code);
    return { success: true, message: '2FA enabled successfully' };
  }

  @Delete('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '禁用 2FA' })
  @ApiResponse({ status: 200, description: '2FA 已禁用' })
  async disable2FA(
    @Headers('x-user-id') userId: string,
    @Body() dto: Disable2FADto,
  ): Promise<{ success: boolean; message: string }> {
    await this.twoFactorService.disable2FA(userId, dto.code);
    return { success: true, message: '2FA disabled successfully' };
  }

  @Post('regenerate-backup-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '重新生成备份码' })
  @ApiResponse({ status: 200, type: [String] })
  async regenerateBackupCodes(
    @Headers('x-user-id') userId: string,
    @Body() dto: RegenerateBackupCodesDto,
  ): Promise<{ backupCodes: string[] }> {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(
      userId,
      dto.code,
    );
    return { backupCodes };
  }
}
