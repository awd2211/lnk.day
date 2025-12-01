import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import { PersonalizedPreviewService } from './personalized-preview.service';
import { JwtAuthGuard, CurrentUser, ScopeGuard, RequireScope } from '@lnk/nestjs-common';
import {
  PreviewTargetType,
  DeviceType,
} from './entities/preview-config.entity';

@ApiTags('personalized-previews')
@Controller('personalized-previews')
export class PersonalizedPreviewController {
  constructor(
    private readonly personalizedPreviewService: PersonalizedPreviewService,
  ) {}

  // ==================== Config Endpoints ====================

  @Post('configs/:linkId')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建个性化预览配置' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        targetType: { type: 'string', enum: Object.values(PreviewTargetType) },
        targetValue: { type: 'string' },
        ogTitle: { type: 'string' },
        ogDescription: { type: 'string' },
        ogImage: { type: 'string' },
        twitterCard: { type: 'string' },
        priority: { type: 'number' },
        isActive: { type: 'boolean' },
        abTestEnabled: { type: 'boolean' },
        abTestWeight: { type: 'number' },
      },
    },
  })
  createConfig(
    @Param('linkId') linkId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.createConfig(
      linkId,
      data,
      user.scope?.teamId || user.sub,
    );
  }

  @Get('configs/link/:linkId')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取链接的所有个性化预览配置' })
  getConfigsByLink(
    @Param('linkId') linkId: string,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.getConfigsByLink(
      linkId,
      user.scope?.teamId || user.sub,
    );
  }

  @Get('configs/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个预览配置' })
  getConfig(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.getConfig(
      id,
      user.scope?.teamId || user.sub,
    );
  }

  @Put('configs/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新预览配置' })
  updateConfig(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.updateConfig(
      id,
      data,
      user.scope?.teamId || user.sub,
    );
  }

  @Delete('configs/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除预览配置' })
  async deleteConfig(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.personalizedPreviewService.deleteConfig(
      id,
      user.scope?.teamId || user.sub,
    );
    return { message: 'Config deleted successfully' };
  }

  // ==================== Template Endpoints ====================

  @Post('templates')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建预览模板' })
  createTemplate(
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.createTemplate(
      user.scope?.teamId || user.sub,
      data,
    );
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有预览模板' })
  getTemplates(@CurrentUser() user: any) {
    return this.personalizedPreviewService.getTemplates(
      user.scope?.teamId || user.sub,
    );
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新预览模板' })
  updateTemplate(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.updateTemplate(
      id,
      data,
      user.scope?.teamId || user.sub,
    );
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除预览模板' })
  async deleteTemplate(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.personalizedPreviewService.deleteTemplate(
      id,
      user.scope?.teamId || user.sub,
    );
    return { message: 'Template deleted successfully' };
  }

  // ==================== Preview Generation Endpoints ====================

  @Get('generate/:linkId')
  @ApiOperation({ summary: '生成个性化预览（公开接口）' })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'device', required: false })
  @ApiQuery({ name: 'referrer', required: false })
  generatePreview(
    @Param('linkId') linkId: string,
    @Query('country') country?: string,
    @Query('language') language?: string,
    @Query('device') device?: string,
    @Query('referrer') referrer?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const detectedLanguage = language || acceptLanguage?.split(',')[0]?.split('-')[0];
    const detectedDevice = device as DeviceType || this.detectDevice(userAgent);

    return this.personalizedPreviewService.generatePersonalizedPreview(linkId, {
      country,
      language: detectedLanguage,
      device: detectedDevice,
      referrer,
      userAgent,
      timestamp: new Date(),
    });
  }

  @Get('html/:linkId')
  @ApiOperation({ summary: '生成预览 HTML 元标签' })
  generatePreviewHTML(
    @Param('linkId') linkId: string,
    @Query('country') country?: string,
    @Query('language') language?: string,
    @Query('device') device?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.personalizedPreviewService.generatePreviewHTML(linkId, {
      country,
      language,
      device: device as DeviceType,
      userAgent,
      timestamp: new Date(),
    });
  }

  @Post('simulate/:linkId')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '模拟预览（测试不同条件下的预览效果）' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        country: { type: 'string' },
        language: { type: 'string' },
        device: { type: 'string', enum: Object.values(DeviceType) },
        referrer: { type: 'string' },
        userAgent: { type: 'string' },
        platform: { type: 'string' },
      },
    },
  })
  simulatePreview(
    @Param('linkId') linkId: string,
    @Body() context: any,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.simulatePreview(
      linkId,
      {
        ...context,
        timestamp: new Date(),
      },
      user.scope?.teamId || user.sub,
    );
  }

  // ==================== Analytics Endpoints ====================

  @Get('analytics/:linkId')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('analytics:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取预览分析数据' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAnalytics(
    @Param('linkId') linkId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.getPreviewAnalytics(
      linkId,
      user.scope?.teamId || user.sub,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ==================== Bulk Operations ====================

  @Post('bulk/apply-template')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量应用模板到多个链接' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
        linkIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  applyTemplateToLinks(
    @Body() data: { templateId: string; linkIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.applyTemplateToLinks(
      data.templateId,
      data.linkIds,
      user.scope?.teamId || user.sub,
    );
  }

  @Post('configs/:id/duplicate')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('links:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '复制配置到另一个链接' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        targetLinkId: { type: 'string' },
      },
    },
  })
  duplicateConfig(
    @Param('id') id: string,
    @Body('targetLinkId') targetLinkId: string,
    @CurrentUser() user: any,
  ) {
    return this.personalizedPreviewService.duplicateConfig(
      id,
      targetLinkId,
      user.scope?.teamId || user.sub,
    );
  }

  // ==================== Reference Data ====================

  @Get('target-types')
  @ApiOperation({ summary: '获取支持的目标类型' })
  getTargetTypes() {
    return this.personalizedPreviewService.getSupportedTargetTypes();
  }

  @Get('template-variables')
  @ApiOperation({ summary: '获取支持的模板变量' })
  getTemplateVariables() {
    return this.personalizedPreviewService.getSupportedTemplateVariables();
  }

  @Get('platforms')
  @ApiOperation({ summary: '获取支持的社交平台列表' })
  getSupportedPlatforms() {
    return {
      platforms: [
        { id: 'facebook', name: 'Facebook', userAgent: 'facebookexternalhit' },
        { id: 'twitter', name: 'Twitter/X', userAgent: 'Twitterbot' },
        { id: 'linkedin', name: 'LinkedIn', userAgent: 'LinkedInBot' },
        { id: 'slack', name: 'Slack', userAgent: 'Slackbot' },
        { id: 'discord', name: 'Discord', userAgent: 'Discordbot' },
        { id: 'telegram', name: 'Telegram', userAgent: 'TelegramBot' },
        { id: 'whatsapp', name: 'WhatsApp', userAgent: 'WhatsApp' },
        { id: 'pinterest', name: 'Pinterest', userAgent: 'Pinterest' },
        { id: 'embedly', name: 'Embedly', userAgent: 'Embedly' },
      ],
    };
  }

  // ==================== Helper Methods ====================

  private detectDevice(userAgent?: string): DeviceType {
    if (!userAgent) return DeviceType.ALL;

    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      if (/tablet|ipad/i.test(ua)) {
        return DeviceType.TABLET;
      }
      return DeviceType.MOBILE;
    }
    return DeviceType.DESKTOP;
  }
}
