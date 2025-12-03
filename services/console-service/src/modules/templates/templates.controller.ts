import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import {
  CreateLinkTemplateDto,
  UpdateLinkTemplateDto,
  ReorderLinkTemplatesDto,
  CreateUTMTemplateDto,
  UpdateUTMTemplateDto,
  CreateCampaignTemplateDto,
  UpdateCampaignTemplateDto,
  CreateBioLinkTemplateDto,
  UpdateBioLinkTemplateDto,
  CreateQRStyleDto,
  UpdateQRStyleDto,
  CreateDeepLinkTemplateDto,
  UpdateDeepLinkTemplateDto,
  CreateWebhookTemplateDto,
  UpdateWebhookTemplateDto,
  CreateRedirectRuleTemplateDto,
  UpdateRedirectRuleTemplateDto,
  CreateSeoTemplateDto,
  UpdateSeoTemplateDto,
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
} from './dto';
import { CurrentUser } from '@lnk/nestjs-common';

@ApiTags('templates')
@Controller('templates')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@UseInterceptors(AuditLogInterceptor)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // ==================== Global ====================

  @Get('stats')
  @ApiOperation({ summary: '获取所有模板类型统计' })
  async getTemplateStats() {
    return this.templatesService.getTemplateStats();
  }

  // ==================== Link Templates ====================

  @Get('links')
  @ApiOperation({ summary: '获取链接模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllLinkTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllLinkTemplates({
      search,
      category,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('links/stats')
  @ApiOperation({ summary: '获取链接模板统计' })
  async getLinkTemplateStats() {
    return this.templatesService.getLinkTemplateStats();
  }

  @Get('links/:id')
  @ApiOperation({ summary: '获取单个链接模板' })
  async findOneLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneLinkTemplate(id);
  }

  @Post('links')
  @ApiOperation({ summary: '创建链接模板' })
  @LogAudit({
    action: 'template.link.create',
    targetType: 'link_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category'],
  })
  async createLinkTemplate(
    @Body() dto: CreateLinkTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.createLinkTemplate(dto, user?.sub);
  }

  @Put('links/:id')
  @ApiOperation({ summary: '更新链接模板' })
  @LogAudit({
    action: 'template.link.update',
    targetType: 'link_template',
    targetIdParam: 'id',
    detailFields: ['name', 'category'],
  })
  async updateLinkTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLinkTemplateDto,
  ) {
    return this.templatesService.updateLinkTemplate(id, dto);
  }

  @Delete('links/:id')
  @ApiOperation({ summary: '删除链接模板' })
  @LogAudit({
    action: 'template.link.delete',
    targetType: 'link_template',
    targetIdParam: 'id',
  })
  async removeLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeLinkTemplate(id);
  }

  @Patch('links/:id/toggle')
  @ApiOperation({ summary: '切换链接模板状态' })
  @LogAudit({
    action: 'template.link.toggle',
    targetType: 'link_template',
    targetIdParam: 'id',
  })
  async toggleLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleLinkTemplate(id);
  }

  @Patch('links/reorder')
  @ApiOperation({ summary: '重新排序链接模板' })
  @LogAudit({
    action: 'template.link.reorder',
    targetType: 'link_template',
    logRequestBody: true,
  })
  async reorderLinkTemplates(@Body() dto: ReorderLinkTemplatesDto) {
    return this.templatesService.reorderLinkTemplates(dto);
  }

  // ==================== UTM Templates ====================

  @Get('utm')
  @ApiOperation({ summary: '获取 UTM 模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllUTMTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllUTMTemplates({
      search,
      category,
      platform,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('utm/platforms')
  @ApiOperation({ summary: '获取可用平台列表' })
  async getUTMPlatforms() {
    return this.templatesService.getUTMPlatforms();
  }

  @Get('utm/:id')
  @ApiOperation({ summary: '获取单个 UTM 模板' })
  async findOneUTMTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneUTMTemplate(id);
  }

  @Post('utm')
  @ApiOperation({ summary: '创建 UTM 模板' })
  @LogAudit({
    action: 'template.utm.create',
    targetType: 'utm_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category', 'platform'],
  })
  async createUTMTemplate(@Body() dto: CreateUTMTemplateDto) {
    return this.templatesService.createUTMTemplate(dto);
  }

  @Put('utm/:id')
  @ApiOperation({ summary: '更新 UTM 模板' })
  @LogAudit({
    action: 'template.utm.update',
    targetType: 'utm_template',
    targetIdParam: 'id',
    detailFields: ['name', 'category', 'platform'],
  })
  async updateUTMTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUTMTemplateDto,
  ) {
    return this.templatesService.updateUTMTemplate(id, dto);
  }

  @Delete('utm/:id')
  @ApiOperation({ summary: '删除 UTM 模板' })
  @LogAudit({
    action: 'template.utm.delete',
    targetType: 'utm_template',
    targetIdParam: 'id',
  })
  async removeUTMTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeUTMTemplate(id);
  }

  @Post('utm/seed-platforms')
  @ApiOperation({ summary: '初始化平台 UTM 模板' })
  @LogAudit({
    action: 'template.utm.seed',
    targetType: 'utm_template',
  })
  async seedUTMPlatformTemplates() {
    return this.templatesService.seedUTMPlatformTemplates();
  }

  // ==================== Campaign Templates ====================

  @Get('campaigns')
  @ApiOperation({ summary: '获取活动模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'scenario', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllCampaignTemplates(
    @Query('search') search?: string,
    @Query('scenario') scenario?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllCampaignTemplates({
      search,
      scenario,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('campaigns/scenarios')
  @ApiOperation({ summary: '获取活动场景列表' })
  async getCampaignScenarios() {
    return this.templatesService.getCampaignScenarios();
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: '获取单个活动模板' })
  async findOneCampaignTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneCampaignTemplate(id);
  }

  @Post('campaigns')
  @ApiOperation({ summary: '创建活动模板' })
  @LogAudit({
    action: 'template.campaign.create',
    targetType: 'campaign_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'scenario'],
  })
  async createCampaignTemplate(@Body() dto: CreateCampaignTemplateDto) {
    return this.templatesService.createCampaignTemplate(dto);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: '更新活动模板' })
  @LogAudit({
    action: 'template.campaign.update',
    targetType: 'campaign_template',
    targetIdParam: 'id',
    detailFields: ['name', 'scenario'],
  })
  async updateCampaignTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignTemplateDto,
  ) {
    return this.templatesService.updateCampaignTemplate(id, dto);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: '删除活动模板' })
  @LogAudit({
    action: 'template.campaign.delete',
    targetType: 'campaign_template',
    targetIdParam: 'id',
  })
  async removeCampaignTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeCampaignTemplate(id);
  }

  // ==================== Bio Link Templates ====================

  @Get('bio-links')
  @ApiOperation({ summary: '获取 Bio Link 模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ['theme', 'layout', 'industry'] })
  @ApiQuery({ name: 'industry', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllBioLinkTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('industry') industry?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllBioLinkTemplates({
      search,
      category,
      industry,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('bio-links/industries')
  @ApiOperation({ summary: '获取行业列表' })
  async getBioLinkIndustries() {
    return this.templatesService.getBioLinkIndustries();
  }

  @Get('bio-links/:id')
  @ApiOperation({ summary: '获取单个 Bio Link 模板' })
  async findOneBioLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneBioLinkTemplate(id);
  }

  @Get('bio-links/:id/preview')
  @ApiOperation({ summary: '获取 Bio Link 模板预览' })
  async getBioLinkTemplatePreview(@Param('id', ParseUUIDPipe) id: string) {
    const template = await this.templatesService.findOneBioLinkTemplate(id);
    return {
      ...template,
      previewHtml: `<div style="background: ${template.theme?.backgroundColor || '#fff'}">Preview for ${template.name}</div>`,
    };
  }

  @Post('bio-links')
  @ApiOperation({ summary: '创建 Bio Link 模板' })
  @LogAudit({
    action: 'template.biolink.create',
    targetType: 'biolink_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category', 'industry'],
  })
  async createBioLinkTemplate(@Body() dto: CreateBioLinkTemplateDto) {
    return this.templatesService.createBioLinkTemplate(dto);
  }

  @Put('bio-links/:id')
  @ApiOperation({ summary: '更新 Bio Link 模板' })
  @LogAudit({
    action: 'template.biolink.update',
    targetType: 'biolink_template',
    targetIdParam: 'id',
    detailFields: ['name', 'category', 'industry'],
  })
  async updateBioLinkTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBioLinkTemplateDto,
  ) {
    return this.templatesService.updateBioLinkTemplate(id, dto);
  }

  @Delete('bio-links/:id')
  @ApiOperation({ summary: '删除 Bio Link 模板' })
  @LogAudit({
    action: 'template.biolink.delete',
    targetType: 'biolink_template',
    targetIdParam: 'id',
  })
  async removeBioLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeBioLinkTemplate(id);
  }

  @Patch('bio-links/:id/toggle')
  @ApiOperation({ summary: '切换 Bio Link 模板状态' })
  @LogAudit({
    action: 'template.biolink.toggle',
    targetType: 'biolink_template',
    targetIdParam: 'id',
  })
  async toggleBioLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleBioLinkTemplate(id);
  }

  // ==================== QR Styles ====================

  @Get('qr-styles')
  @ApiOperation({ summary: '获取 QR 码样式列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllQRStyles(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllQRStyles({
      search,
      category,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('qr-styles/:id')
  @ApiOperation({ summary: '获取单个 QR 码样式' })
  async findOneQRStyle(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneQRStyle(id);
  }

  @Get('qr-styles/:id/preview')
  @ApiOperation({ summary: '获取 QR 码样式预览' })
  async getQRStylePreview(@Param('id', ParseUUIDPipe) id: string) {
    const style = await this.templatesService.findOneQRStyle(id);
    return {
      ...style,
      previewUrl: `/api/v1/templates/qr-styles/${id}/preview-image`,
    };
  }

  @Post('qr-styles')
  @ApiOperation({ summary: '创建 QR 码样式' })
  @LogAudit({
    action: 'template.qrstyle.create',
    targetType: 'qr_style',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category'],
  })
  async createQRStyle(@Body() dto: CreateQRStyleDto) {
    return this.templatesService.createQRStyle(dto);
  }

  @Put('qr-styles/:id')
  @ApiOperation({ summary: '更新 QR 码样式' })
  @LogAudit({
    action: 'template.qrstyle.update',
    targetType: 'qr_style',
    targetIdParam: 'id',
    detailFields: ['name', 'category'],
  })
  async updateQRStyle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQRStyleDto,
  ) {
    return this.templatesService.updateQRStyle(id, dto);
  }

  @Delete('qr-styles/:id')
  @ApiOperation({ summary: '删除 QR 码样式' })
  @LogAudit({
    action: 'template.qrstyle.delete',
    targetType: 'qr_style',
    targetIdParam: 'id',
  })
  async removeQRStyle(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeQRStyle(id);
  }

  @Patch('qr-styles/:id/toggle')
  @ApiOperation({ summary: '切换 QR 码样式状态' })
  @LogAudit({
    action: 'template.qrstyle.toggle',
    targetType: 'qr_style',
    targetIdParam: 'id',
  })
  async toggleQRStyle(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleQRStyle(id);
  }

  @Post('qr-styles/seed')
  @ApiOperation({ summary: '初始化默认 QR 码样式' })
  @LogAudit({
    action: 'template.qrstyle.seed',
    targetType: 'qr_style',
  })
  async seedQRStyles() {
    return this.templatesService.seedQRStyles();
  }

  // ==================== DeepLink Templates ====================

  @Get('deeplinks')
  @ApiOperation({ summary: '获取 DeepLink 模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ['social', 'commerce', 'media', 'utility', 'custom'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDeepLinkTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllDeepLinkTemplates({
      search,
      category,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('deeplinks/categories')
  @ApiOperation({ summary: '获取 DeepLink 分类列表' })
  async getDeepLinkCategories() {
    return this.templatesService.getDeepLinkCategories();
  }

  @Get('deeplinks/:id')
  @ApiOperation({ summary: '获取单个 DeepLink 模板' })
  async findOneDeepLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneDeepLinkTemplate(id);
  }

  @Post('deeplinks')
  @ApiOperation({ summary: '创建 DeepLink 模板' })
  @LogAudit({
    action: 'template.deeplink.create',
    targetType: 'deeplink_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category'],
  })
  async createDeepLinkTemplate(@Body() dto: CreateDeepLinkTemplateDto) {
    return this.templatesService.createDeepLinkTemplate(dto);
  }

  @Put('deeplinks/:id')
  @ApiOperation({ summary: '更新 DeepLink 模板' })
  @LogAudit({
    action: 'template.deeplink.update',
    targetType: 'deeplink_template',
    targetIdParam: 'id',
    detailFields: ['name', 'category'],
  })
  async updateDeepLinkTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeepLinkTemplateDto,
  ) {
    return this.templatesService.updateDeepLinkTemplate(id, dto);
  }

  @Delete('deeplinks/:id')
  @ApiOperation({ summary: '删除 DeepLink 模板' })
  @LogAudit({
    action: 'template.deeplink.delete',
    targetType: 'deeplink_template',
    targetIdParam: 'id',
  })
  async removeDeepLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeDeepLinkTemplate(id);
  }

  @Patch('deeplinks/:id/toggle')
  @ApiOperation({ summary: '切换 DeepLink 模板状态' })
  @LogAudit({
    action: 'template.deeplink.toggle',
    targetType: 'deeplink_template',
    targetIdParam: 'id',
  })
  async toggleDeepLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleDeepLinkTemplate(id);
  }

  // ==================== Webhook Templates ====================

  @Get('webhooks')
  @ApiOperation({ summary: '获取 Webhook 模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'platform', required: false, enum: ['slack', 'discord', 'teams', 'custom'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllWebhookTemplates(
    @Query('search') search?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllWebhookTemplates({
      search,
      platform,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('webhooks/platforms')
  @ApiOperation({ summary: '获取 Webhook 平台列表' })
  async getWebhookPlatforms() {
    return this.templatesService.getWebhookPlatforms();
  }

  @Get('webhooks/:id')
  @ApiOperation({ summary: '获取单个 Webhook 模板' })
  async findOneWebhookTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneWebhookTemplate(id);
  }

  @Post('webhooks')
  @ApiOperation({ summary: '创建 Webhook 模板' })
  @LogAudit({
    action: 'template.webhook.create',
    targetType: 'webhook_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'platform'],
  })
  async createWebhookTemplate(@Body() dto: CreateWebhookTemplateDto) {
    return this.templatesService.createWebhookTemplate(dto);
  }

  @Put('webhooks/:id')
  @ApiOperation({ summary: '更新 Webhook 模板' })
  @LogAudit({
    action: 'template.webhook.update',
    targetType: 'webhook_template',
    targetIdParam: 'id',
    detailFields: ['name', 'platform'],
  })
  async updateWebhookTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookTemplateDto,
  ) {
    return this.templatesService.updateWebhookTemplate(id, dto);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: '删除 Webhook 模板' })
  @LogAudit({
    action: 'template.webhook.delete',
    targetType: 'webhook_template',
    targetIdParam: 'id',
  })
  async removeWebhookTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeWebhookTemplate(id);
  }

  @Patch('webhooks/:id/toggle')
  @ApiOperation({ summary: '切换 Webhook 模板状态' })
  @LogAudit({
    action: 'template.webhook.toggle',
    targetType: 'webhook_template',
    targetIdParam: 'id',
  })
  async toggleWebhookTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleWebhookTemplate(id);
  }

  // ==================== Redirect Rule Templates ====================

  @Get('redirect-rules')
  @ApiOperation({ summary: '获取重定向规则模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ['ab_test', 'geo', 'device', 'time', 'custom'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllRedirectRuleTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllRedirectRuleTemplates({
      search,
      category,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('redirect-rules/categories')
  @ApiOperation({ summary: '获取重定向规则分类列表' })
  async getRedirectRuleCategories() {
    return this.templatesService.getRedirectRuleCategories();
  }

  @Get('redirect-rules/:id')
  @ApiOperation({ summary: '获取单个重定向规则模板' })
  async findOneRedirectRuleTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneRedirectRuleTemplate(id);
  }

  @Post('redirect-rules')
  @ApiOperation({ summary: '创建重定向规则模板' })
  @LogAudit({
    action: 'template.redirect_rule.create',
    targetType: 'redirect_rule_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category'],
  })
  async createRedirectRuleTemplate(@Body() dto: CreateRedirectRuleTemplateDto) {
    return this.templatesService.createRedirectRuleTemplate(dto);
  }

  @Put('redirect-rules/:id')
  @ApiOperation({ summary: '更新重定向规则模板' })
  @LogAudit({
    action: 'template.redirect_rule.update',
    targetType: 'redirect_rule_template',
    targetIdParam: 'id',
    detailFields: ['name', 'category'],
  })
  async updateRedirectRuleTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRedirectRuleTemplateDto,
  ) {
    return this.templatesService.updateRedirectRuleTemplate(id, dto);
  }

  @Delete('redirect-rules/:id')
  @ApiOperation({ summary: '删除重定向规则模板' })
  @LogAudit({
    action: 'template.redirect_rule.delete',
    targetType: 'redirect_rule_template',
    targetIdParam: 'id',
  })
  async removeRedirectRuleTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeRedirectRuleTemplate(id);
  }

  @Patch('redirect-rules/:id/toggle')
  @ApiOperation({ summary: '切换重定向规则模板状态' })
  @LogAudit({
    action: 'template.redirect_rule.toggle',
    targetType: 'redirect_rule_template',
    targetIdParam: 'id',
  })
  async toggleRedirectRuleTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleRedirectRuleTemplate(id);
  }

  // ==================== SEO Templates ====================

  @Get('seo')
  @ApiOperation({ summary: '获取 SEO 模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ['general', 'landing_page', 'bio_link', 'product', 'article', 'profile'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllSeoTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllSeoTemplates({
      search,
      category,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('seo/categories')
  @ApiOperation({ summary: '获取 SEO 分类列表' })
  async getSeoCategories() {
    return this.templatesService.getSeoCategories();
  }

  @Get('seo/:id')
  @ApiOperation({ summary: '获取单个 SEO 模板' })
  async findOneSeoTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneSeoTemplate(id);
  }

  @Post('seo')
  @ApiOperation({ summary: '创建 SEO 模板' })
  @LogAudit({
    action: 'template.seo.create',
    targetType: 'seo_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category'],
  })
  async createSeoTemplate(@Body() dto: CreateSeoTemplateDto) {
    return this.templatesService.createSeoTemplate(dto);
  }

  @Put('seo/:id')
  @ApiOperation({ summary: '更新 SEO 模板' })
  @LogAudit({
    action: 'template.seo.update',
    targetType: 'seo_template',
    targetIdParam: 'id',
    detailFields: ['name', 'category'],
  })
  async updateSeoTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeoTemplateDto,
  ) {
    return this.templatesService.updateSeoTemplate(id, dto);
  }

  @Delete('seo/:id')
  @ApiOperation({ summary: '删除 SEO 模板' })
  @LogAudit({
    action: 'template.seo.delete',
    targetType: 'seo_template',
    targetIdParam: 'id',
  })
  async removeSeoTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeSeoTemplate(id);
  }

  @Patch('seo/:id/toggle')
  @ApiOperation({ summary: '切换 SEO 模板状态' })
  @LogAudit({
    action: 'template.seo.toggle',
    targetType: 'seo_template',
    targetIdParam: 'id',
  })
  async toggleSeoTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleSeoTemplate(id);
  }

  // ==================== Report Templates ====================

  @Get('reports')
  @ApiOperation({ summary: '获取报告模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ['traffic', 'conversion', 'engagement', 'comparison', 'custom'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllReportTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllReportTemplates({
      search,
      category,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('reports/categories')
  @ApiOperation({ summary: '获取报告分类列表' })
  async getReportCategories() {
    return this.templatesService.getReportCategories();
  }

  @Get('reports/metrics')
  @ApiOperation({ summary: '获取可用指标列表' })
  async getAvailableMetrics() {
    return this.templatesService.getAvailableMetrics();
  }

  @Get('reports/dimensions')
  @ApiOperation({ summary: '获取可用维度列表' })
  async getAvailableDimensions() {
    return this.templatesService.getAvailableDimensions();
  }

  @Get('reports/:id')
  @ApiOperation({ summary: '获取单个报告模板' })
  async findOneReportTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneReportTemplate(id);
  }

  @Post('reports')
  @ApiOperation({ summary: '创建报告模板' })
  @LogAudit({
    action: 'template.report.create',
    targetType: 'report_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category'],
  })
  async createReportTemplate(@Body() dto: CreateReportTemplateDto) {
    return this.templatesService.createReportTemplate(dto);
  }

  @Put('reports/:id')
  @ApiOperation({ summary: '更新报告模板' })
  @LogAudit({
    action: 'template.report.update',
    targetType: 'report_template',
    targetIdParam: 'id',
    detailFields: ['name', 'category'],
  })
  async updateReportTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportTemplateDto,
  ) {
    return this.templatesService.updateReportTemplate(id, dto);
  }

  @Delete('reports/:id')
  @ApiOperation({ summary: '删除报告模板' })
  @LogAudit({
    action: 'template.report.delete',
    targetType: 'report_template',
    targetIdParam: 'id',
  })
  async removeReportTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeReportTemplate(id);
  }

  @Patch('reports/:id/toggle')
  @ApiOperation({ summary: '切换报告模板状态' })
  @LogAudit({
    action: 'template.report.toggle',
    targetType: 'report_template',
    targetIdParam: 'id',
  })
  async toggleReportTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleReportTemplate(id);
  }
}
