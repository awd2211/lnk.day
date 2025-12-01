import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

import { TwoFactorService } from './two-factor.service';
import {
  JwtAuthGuard,
  CurrentUser,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import {
  Enable2FAResponseDto,
  Verify2FADto,
  Disable2FADto,
  TwoFactorStatusDto,
  RegenerateBackupCodesDto,
} from './dto/two-factor.dto';

@ApiTags('2fa')
@Controller('auth/2fa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('status')
  @ApiOperation({ summary: '获取 2FA 状态' })
  @ApiResponse({ status: 200, type: TwoFactorStatusDto })
  async getStatus(@CurrentUser() user: AuthenticatedUser): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.getStatus(user.id);
  }

  @Post('enable')
  @ApiOperation({ summary: '启用 2FA（获取密钥和二维码）' })
  @ApiResponse({ status: 200, type: Enable2FAResponseDto })
  async enable2FA(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Enable2FAResponseDto> {
    return this.twoFactorService.enable2FA(user.id, user.email || `user-${user.id}@lnk.day`);
  }

  @Post('verify')
  @ApiOperation({ summary: '验证并激活 2FA' })
  @ApiResponse({ status: 200, description: '2FA 已激活' })
  async verify2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Verify2FADto,
  ): Promise<{ success: boolean; message: string }> {
    await this.twoFactorService.verify2FA(user.id, dto.code);
    return { success: true, message: '2FA enabled successfully' };
  }

  @Delete('disable')
  @ApiOperation({ summary: '禁用 2FA' })
  @ApiResponse({ status: 200, description: '2FA 已禁用' })
  async disable2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Disable2FADto,
  ): Promise<{ success: boolean; message: string }> {
    await this.twoFactorService.disable2FA(user.id, dto.code);
    return { success: true, message: '2FA disabled successfully' };
  }

  @Post('regenerate-backup-codes')
  @ApiOperation({ summary: '重新生成备份码' })
  @ApiResponse({ status: 200, type: [String] })
  async regenerateBackupCodes(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegenerateBackupCodesDto,
  ): Promise<{ backupCodes: string[] }> {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(
      user.id,
      dto.code,
    );
    return { backupCodes };
  }
}
