import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';

/**
 * Public Preset Templates Controller
 *
 * 提供给用户门户访问的预设模板端点（只读）
 * 只返回 active 状态的模板
 * 使用普通用户 JWT 认证
 */
@ApiTags('preset-templates')
@Controller('preset-templates')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PublicTemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // ==================== Link Templates ====================

  @Get('links')
  @ApiOperation({ summary: '获取链接预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllLinkTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllLinkTemplates({
      search,
      category,
      status: 'active', // 只返回激活的模板
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('links/:id')
  @ApiOperation({ summary: '获取单个链接预设模板' })
  async findOneLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneLinkTemplate(id);
  }

  // ==================== UTM Templates ====================

  @Get('utm')
  @ApiOperation({ summary: '获取 UTM 预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllUTMTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('platform') platform?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllUTMTemplates({
      search,
      category,
      platform,
      status: 'active',
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
  @ApiOperation({ summary: '获取单个 UTM 预设模板' })
  async findOneUTMTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneUTMTemplate(id);
  }

  // ==================== Campaign Templates ====================

  @Get('campaigns')
  @ApiOperation({ summary: '获取活动预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'scenario', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllCampaignTemplates(
    @Query('search') search?: string,
    @Query('scenario') scenario?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllCampaignTemplates({
      search,
      scenario,
      status: 'active',
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
  @ApiOperation({ summary: '获取单个活动预设模板' })
  async findOneCampaignTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneCampaignTemplate(id);
  }

  // ==================== Bio Link Templates ====================

  @Get('bio-links')
  @ApiOperation({ summary: '获取 Bio Link 预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'industry', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllBioLinkTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('industry') industry?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllBioLinkTemplates({
      search,
      category,
      industry,
      status: 'active',
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
  @ApiOperation({ summary: '获取单个 Bio Link 预设模板' })
  async findOneBioLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneBioLinkTemplate(id);
  }

  @Get('bio-links/:id/preview')
  @ApiOperation({ summary: '获取 Bio Link 预设模板预览' })
  async getBioLinkTemplatePreview(@Param('id', ParseUUIDPipe) id: string) {
    const template = await this.templatesService.findOneBioLinkTemplate(id);
    return {
      ...template,
      previewHtml: `<div style="background: ${template.theme?.backgroundColor || '#fff'}">Preview for ${template.name}</div>`,
    };
  }

  // ==================== QR Styles ====================

  @Get('qr-styles')
  @ApiOperation({ summary: '获取 QR 码样式预设列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllQRStyles(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllQRStyles({
      search,
      category,
      status: 'active',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('qr-styles/:id')
  @ApiOperation({ summary: '获取单个 QR 码样式预设' })
  async findOneQRStyle(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneQRStyle(id);
  }

  @Get('qr-styles/:id/preview')
  @ApiOperation({ summary: '获取 QR 码样式预设预览' })
  async getQRStylePreview(@Param('id', ParseUUIDPipe) id: string) {
    const style = await this.templatesService.findOneQRStyle(id);
    return {
      ...style,
      previewUrl: `/api/v1/preset-templates/qr-styles/${id}/preview-image`,
    };
  }

  // ==================== DeepLink Templates ====================

  @Get('deeplinks')
  @ApiOperation({ summary: '获取 DeepLink 预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDeepLinkTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllDeepLinkTemplates({
      search,
      category,
      status: 'active',
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
  @ApiOperation({ summary: '获取单个 DeepLink 预设模板' })
  async findOneDeepLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneDeepLinkTemplate(id);
  }

  // ==================== Webhook Templates ====================

  @Get('webhooks')
  @ApiOperation({ summary: '获取 Webhook 预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllWebhookTemplates(
    @Query('search') search?: string,
    @Query('platform') platform?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllWebhookTemplates({
      search,
      platform,
      status: 'active',
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
  @ApiOperation({ summary: '获取单个 Webhook 预设模板' })
  async findOneWebhookTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneWebhookTemplate(id);
  }

  // ==================== Redirect Rule Templates ====================

  @Get('redirect-rules')
  @ApiOperation({ summary: '获取重定向规则预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllRedirectRuleTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllRedirectRuleTemplates({
      search,
      category,
      status: 'active',
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
  @ApiOperation({ summary: '获取单个重定向规则预设模板' })
  async findOneRedirectRuleTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneRedirectRuleTemplate(id);
  }

  // ==================== SEO Templates ====================

  @Get('seo')
  @ApiOperation({ summary: '获取 SEO 预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllSeoTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllSeoTemplates({
      search,
      category,
      status: 'active',
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
  @ApiOperation({ summary: '获取单个 SEO 预设模板' })
  async findOneSeoTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneSeoTemplate(id);
  }

  // ==================== Report Templates ====================

  @Get('reports')
  @ApiOperation({ summary: '获取报告预设模板列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllReportTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAllReportTemplates({
      search,
      category,
      status: 'active',
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
  @ApiOperation({ summary: '获取单个报告预设模板' })
  async findOneReportTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOneReportTemplate(id);
  }
}
