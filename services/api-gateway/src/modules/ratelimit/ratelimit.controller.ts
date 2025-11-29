import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { RateLimitService } from './ratelimit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkipRateLimit } from '../../common/decorators/rate-limit.decorator';
import { PLAN_RATE_LIMITS, PlanType } from '../../common/guards/plan-throttler.guard';

@ApiTags('rate-limit')
@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  // ========== 公开端点 ==========

  @Get('limits')
  @ApiOperation({ summary: '获取所有套餐的速率限制配置' })
  @SkipRateLimit()
  getPlanLimits() {
    return {
      plans: Object.entries(PLAN_RATE_LIMITS).map(([plan, limits]) => ({
        plan,
        limits: {
          requestsPerMinute: limits.requestsPerMinute,
          requestsPerHour: limits.requestsPerHour,
          requestsPerDay: limits.requestsPerDay === -1 ? 'unlimited' : limits.requestsPerDay,
        },
      })),
    };
  }

  // ========== 需要认证的端点 ==========

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户的速率限制状态' })
  @SkipRateLimit()
  async getMyRateLimitStatus(@Req() req: any) {
    const user = req.user;
    const identifier = `user:${user.id}`;
    const plan: PlanType = user.plan || 'free';

    return this.rateLimitService.getRateLimitInfo(identifier, plan);
  }

  @Get('status/:identifier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取指定标识的速率限制状态（管理员）' })
  @SkipRateLimit()
  async getRateLimitStatus(
    @Param('identifier') identifier: string,
    @Query('plan') plan: PlanType = 'free',
  ) {
    return this.rateLimitService.getRateLimitInfo(identifier, plan);
  }

  // ========== 管理端点 ==========

  @Post('reset/:identifier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '重置指定标识的速率限制（管理员）' })
  async resetRateLimit(@Param('identifier') identifier: string) {
    await this.rateLimitService.resetRateLimit(identifier);
    return { success: true, message: `Rate limit reset for ${identifier}` };
  }

  @Post('boost/:identifier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '临时提升速率限制（管理员）' })
  async boostRateLimit(
    @Param('identifier') identifier: string,
    @Body() body: { multiplier: number; durationMinutes: number },
  ) {
    await this.rateLimitService.boostRateLimit(
      identifier,
      body.multiplier,
      body.durationMinutes * 60 * 1000,
    );
    return {
      success: true,
      message: `Rate limit boosted ${body.multiplier}x for ${body.durationMinutes} minutes`,
    };
  }

  @Post('blacklist/:identifier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加到黑名单（管理员）' })
  async addToBlacklist(
    @Param('identifier') identifier: string,
    @Body() body: { reason: string; durationMinutes?: number },
  ) {
    await this.rateLimitService.addToBlacklist(
      identifier,
      body.reason,
      body.durationMinutes ? body.durationMinutes * 60 * 1000 : undefined,
    );
    return { success: true, message: `Added ${identifier} to blacklist` };
  }

  @Delete('blacklist/:identifier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '从黑名单移除（管理员）' })
  async removeFromBlacklist(@Param('identifier') identifier: string) {
    await this.rateLimitService.removeFromBlacklist(identifier);
    return { success: true, message: `Removed ${identifier} from blacklist` };
  }

  @Get('blacklist/:identifier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '检查是否在黑名单（管理员）' })
  async checkBlacklist(@Param('identifier') identifier: string) {
    const isBlacklisted = await this.rateLimitService.isBlacklisted(identifier);
    return { identifier, isBlacklisted };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取速率限制统计（管理员）' })
  @SkipRateLimit()
  async getStats() {
    return this.rateLimitService.getStats();
  }
}
