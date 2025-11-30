import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
  isPlatformAdmin,
} from '@lnk/nestjs-common';
import { CampaignService } from './campaign.service';
import { CampaignStatus, UTMParams } from './entities/campaign.entity';

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '创建营销活动' })
  create(
    @Body() data: any,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.campaignService.create({ ...data, userId: user.id, teamId });
  }

  @Get()
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取营销活动列表' })
  @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
  @ApiQuery({ name: 'all', required: false, type: Boolean, description: '管理员模式，返回所有团队的活动' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: CampaignStatus,
    @Query('all') all?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // 平台管理员可以查看所有活动
    const shouldQueryAll = all === 'true' && isPlatformAdmin(user);
    return this.campaignService.findAll(shouldQueryAll ? undefined : teamId, { status, page, limit });
  }

  @Get('active')
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取进行中的营销活动' })
  findActive(@ScopedTeamId() teamId: string) {
    return this.campaignService.findActive(teamId);
  }

  @Get(':id')
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取单个营销活动' })
  async findOne(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权访问此营销活动');
    }
    return campaign;
  }

  @Get(':id/stats')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取营销活动统计' })
  async getStats(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权访问此营销活动统计');
    }
    return this.campaignService.getStats(id);
  }

  @Put(':id')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新营销活动' })
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权修改此营销活动');
    }
    return this.campaignService.update(id, data);
  }

  @Post(':id/start')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '启动营销活动' })
  async start(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权启动此营销活动');
    }
    return this.campaignService.start(id);
  }

  @Post(':id/pause')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '暂停营销活动' })
  async pause(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权暂停此营销活动');
    }
    return this.campaignService.pause(id);
  }

  @Post(':id/complete')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '结束营销活动' })
  async complete(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权结束此营销活动');
    }
    return this.campaignService.complete(id);
  }

  @Post(':id/archive')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '归档营销活动' })
  async archive(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权归档此营销活动');
    }
    return this.campaignService.archive(id);
  }

  @Post(':id/links')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '添加链接到营销活动' })
  async addLinks(
    @Param('id') id: string,
    @Body() body: { linkIds: string[] },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权修改此营销活动');
    }
    return this.campaignService.addLinks(id, body.linkIds);
  }

  @Delete(':id/links')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '从营销活动移除链接' })
  async removeLinks(
    @Param('id') id: string,
    @Body() body: { linkIds: string[] },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权修改此营销活动');
    }
    return this.campaignService.removeLinks(id, body.linkIds);
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '复制营销活动' })
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权复制此营销活动');
    }
    return this.campaignService.duplicate(id, user.id, teamId);
  }

  @Post('utm-builder')
  @ApiOperation({ summary: 'UTM URL 构建器' })
  buildUtmUrl(@Body() body: { baseUrl: string; utmParams: UTMParams }) {
    return { url: this.campaignService.buildUtmUrl(body.baseUrl, body.utmParams) };
  }

  @Delete(':id')
  @RequirePermissions(Permission.CAMPAIGNS_DELETE)
  @ApiOperation({ summary: '删除营销活动' })
  async remove(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaignService.findOne(id);
    if (!isPlatformAdmin(user) && campaign.teamId !== teamId) {
      throw new ForbiddenException('无权删除此营销活动');
    }
    return this.campaignService.remove(id);
  }
}
