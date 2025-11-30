import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PrivacyService } from './privacy.service';
import {
  UpdateConsentDto,
  BulkUpdateConsentDto,
  CreateDataRequestDto,
  CancelDeletionDto,
} from './dto/privacy.dto';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@lnk/nestjs-common';
import { ConsentType } from './entities/user-consent.entity';

@ApiTags('privacy')
@Controller('privacy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  // ========== 隐私概览 ==========

  @Get('overview')
  @ApiOperation({ summary: '获取隐私设置概览' })
  async getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.privacyService.getPrivacyOverview(user.sub);
  }

  // ========== 同意管理 ==========

  @Get('consents')
  @ApiOperation({ summary: '获取所有同意状态' })
  async getConsents(@CurrentUser() user: AuthenticatedUser) {
    const consents = await this.privacyService.getConsents(user.sub);
    return { consents };
  }

  @Post('consents')
  @ApiOperation({ summary: '更新单个同意状态' })
  async updateConsent(
    @Body() dto: UpdateConsentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const consent = await this.privacyService.updateConsent(
      user.sub,
      dto,
      ip,
      userAgent,
    );
    return { consent };
  }

  @Post('consents/bulk')
  @ApiOperation({ summary: '批量更新同意状态' })
  async bulkUpdateConsents(
    @Body() dto: BulkUpdateConsentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const consents = await this.privacyService.bulkUpdateConsents(
      user.sub,
      dto,
      ip,
      userAgent,
    );
    return { consents };
  }

  @Get('consents/types')
  @ApiOperation({ summary: '获取所有同意类型' })
  getConsentTypes() {
    return {
      types: [
        {
          id: ConsentType.TERMS_OF_SERVICE,
          name: '服务条款',
          description: '接受 lnk.day 的服务条款',
          required: true,
        },
        {
          id: ConsentType.PRIVACY_POLICY,
          name: '隐私政策',
          description: '接受 lnk.day 的隐私政策',
          required: true,
        },
        {
          id: ConsentType.MARKETING_EMAILS,
          name: '营销邮件',
          description: '接收产品更新和促销邮件',
          required: false,
        },
        {
          id: ConsentType.ANALYTICS_TRACKING,
          name: '分析追踪',
          description: '允许使用分析工具改进服务',
          required: false,
        },
        {
          id: ConsentType.THIRD_PARTY_SHARING,
          name: '第三方共享',
          description: '允许与第三方合作伙伴共享数据',
          required: false,
        },
        {
          id: ConsentType.COOKIE_ESSENTIAL,
          name: '必要 Cookie',
          description: '网站正常运行所需的 Cookie',
          required: true,
        },
        {
          id: ConsentType.COOKIE_ANALYTICS,
          name: '分析 Cookie',
          description: '用于分析网站使用情况的 Cookie',
          required: false,
        },
        {
          id: ConsentType.COOKIE_MARKETING,
          name: '营销 Cookie',
          description: '用于个性化广告的 Cookie',
          required: false,
        },
      ],
    };
  }

  // ========== 数据请求 ==========

  @Get('requests')
  @ApiOperation({ summary: '获取数据请求历史' })
  async getDataRequests(@CurrentUser() user: AuthenticatedUser) {
    const requests = await this.privacyService.getDataRequests(user.sub);
    return { requests };
  }

  @Post('requests')
  @ApiOperation({ summary: '创建数据请求（导出/删除等）' })
  async createDataRequest(
    @Body() dto: CreateDataRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    const request = await this.privacyService.createDataRequest(
      user.sub,
      dto,
      ip,
    );
    return { request };
  }

  // ========== 数据导出 ==========

  @Post('export')
  @ApiOperation({ summary: '请求导出个人数据' })
  async requestExport(@CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    const request = await this.privacyService.createDataRequest(
      user.sub,
      { type: 'export' as any },
      ip,
    );
    return {
      message: '数据导出请求已提交，您将在邮件中收到下载链接',
      requestId: request.id,
    };
  }

  // ========== 账户删除 ==========

  @Post('delete-account')
  @ApiOperation({ summary: '请求删除账户（30天冷静期）' })
  async requestAccountDeletion(
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    const request = await this.privacyService.createDataRequest(
      user.sub,
      { type: 'delete' as any, reason: body.reason },
      ip,
    );
    return {
      message: '账户删除请求已提交，您有30天的冷静期可以取消',
      requestId: request.id,
      scheduledDeletionDate: request.coolingPeriodEndsAt,
    };
  }

  @Delete('delete-account/:requestId')
  @ApiOperation({ summary: '取消账户删除请求' })
  async cancelAccountDeletion(
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.privacyService.cancelDeletionRequest(user.sub, requestId);
    return { message: '删除请求已取消' };
  }

  // ========== 权利说明 ==========

  @Get('rights')
  @ApiOperation({ summary: '获取用户数据权利说明' })
  getRights() {
    return {
      gdpr: {
        name: 'GDPR (欧盟通用数据保护条例)',
        rights: [
          {
            name: '访问权',
            description: '您有权获取我们持有的关于您的个人数据的副本',
            action: 'export',
          },
          {
            name: '更正权',
            description: '您有权要求我们更正不准确的个人数据',
            action: 'rectification',
          },
          {
            name: '删除权',
            description: '您有权要求我们删除您的个人数据',
            action: 'delete',
          },
          {
            name: '限制处理权',
            description: '您有权要求我们限制对您数据的处理',
            action: 'restrict',
          },
          {
            name: '数据可携带权',
            description: '您有权以机器可读格式获取您的数据',
            action: 'portability',
          },
          {
            name: '反对权',
            description: '您有权反对我们处理您的个人数据',
            action: 'object',
          },
        ],
      },
      ccpa: {
        name: 'CCPA (加州消费者隐私法)',
        rights: [
          {
            name: '知情权',
            description: '您有权了解我们收集了哪些个人信息',
            action: 'access',
          },
          {
            name: '删除权',
            description: '您有权要求删除您的个人信息',
            action: 'delete',
          },
          {
            name: '选择退出销售权',
            description: '您有权选择退出个人信息的销售',
            action: 'opt-out',
          },
          {
            name: '非歧视权',
            description: '您行使隐私权时不会受到歧视',
            action: 'none',
          },
        ],
      },
    };
  }
}
