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
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
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
  async createLinkTemplate(
    @Body() dto: CreateLinkTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.createLinkTemplate(dto, user?.sub);
  }

  @Put('links/:id')
  @ApiOperation({ summary: '更新链接模板' })
  async updateLinkTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLinkTemplateDto,
  ) {
    return this.templatesService.updateLinkTemplate(id, dto);
  }

  @Delete('links/:id')
  @ApiOperation({ summary: '删除链接模板' })
  async removeLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeLinkTemplate(id);
  }

  @Patch('links/:id/toggle')
  @ApiOperation({ summary: '切换链接模板状态' })
  async toggleLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleLinkTemplate(id);
  }

  @Patch('links/reorder')
  @ApiOperation({ summary: '重新排序链接模板' })
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
  async createUTMTemplate(@Body() dto: CreateUTMTemplateDto) {
    return this.templatesService.createUTMTemplate(dto);
  }

  @Put('utm/:id')
  @ApiOperation({ summary: '更新 UTM 模板' })
  async updateUTMTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUTMTemplateDto,
  ) {
    return this.templatesService.updateUTMTemplate(id, dto);
  }

  @Delete('utm/:id')
  @ApiOperation({ summary: '删除 UTM 模板' })
  async removeUTMTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeUTMTemplate(id);
  }

  @Post('utm/seed-platforms')
  @ApiOperation({ summary: '初始化平台 UTM 模板' })
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
  async createCampaignTemplate(@Body() dto: CreateCampaignTemplateDto) {
    return this.templatesService.createCampaignTemplate(dto);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: '更新活动模板' })
  async updateCampaignTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignTemplateDto,
  ) {
    return this.templatesService.updateCampaignTemplate(id, dto);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: '删除活动模板' })
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
  async createBioLinkTemplate(@Body() dto: CreateBioLinkTemplateDto) {
    return this.templatesService.createBioLinkTemplate(dto);
  }

  @Put('bio-links/:id')
  @ApiOperation({ summary: '更新 Bio Link 模板' })
  async updateBioLinkTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBioLinkTemplateDto,
  ) {
    return this.templatesService.updateBioLinkTemplate(id, dto);
  }

  @Delete('bio-links/:id')
  @ApiOperation({ summary: '删除 Bio Link 模板' })
  async removeBioLinkTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeBioLinkTemplate(id);
  }

  @Patch('bio-links/:id/toggle')
  @ApiOperation({ summary: '切换 Bio Link 模板状态' })
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
  async createQRStyle(@Body() dto: CreateQRStyleDto) {
    return this.templatesService.createQRStyle(dto);
  }

  @Put('qr-styles/:id')
  @ApiOperation({ summary: '更新 QR 码样式' })
  async updateQRStyle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQRStyleDto,
  ) {
    return this.templatesService.updateQRStyle(id, dto);
  }

  @Delete('qr-styles/:id')
  @ApiOperation({ summary: '删除 QR 码样式' })
  async removeQRStyle(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.removeQRStyle(id);
  }

  @Patch('qr-styles/:id/toggle')
  @ApiOperation({ summary: '切换 QR 码样式状态' })
  async toggleQRStyle(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.toggleQRStyle(id);
  }

  @Post('qr-styles/seed')
  @ApiOperation({ summary: '初始化默认 QR 码样式' })
  async seedQRStyles() {
    return this.templatesService.seedQRStyles();
  }
}
