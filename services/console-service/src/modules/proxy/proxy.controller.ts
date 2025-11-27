import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProxyService } from './proxy.service';

@ApiTags('proxy')
@Controller('proxy')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  // User Management
  @Get('users')
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getUsers({ page, limit, search });
  }

  @Get('users/:id')
  @ApiOperation({ summary: '获取用户详情' })
  getUser(@Param('id') id: string) {
    return this.proxyService.getUser(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: '更新用户' })
  updateUser(@Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateUser(id, data);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: '删除用户' })
  deleteUser(@Param('id') id: string) {
    return this.proxyService.deleteUser(id);
  }

  // Team Management
  @Get('teams')
  @ApiOperation({ summary: '获取团队列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTeams(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.getTeams({ page, limit });
  }

  @Get('teams/:id')
  @ApiOperation({ summary: '获取团队详情' })
  getTeam(@Param('id') id: string) {
    return this.proxyService.getTeam(id);
  }

  // Link Management
  @Get('links')
  @ApiOperation({ summary: '获取链接列表' })
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  getLinks(
    @Query('teamId') teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.proxyService.getLinks(teamId, { page, limit, status });
  }

  @Get('links/:id')
  @ApiOperation({ summary: '获取链接详情' })
  getLink(@Param('id') id: string) {
    return this.proxyService.getLink(id);
  }

  @Delete('links/:id')
  @ApiOperation({ summary: '删除链接' })
  deleteLink(@Param('id') id: string) {
    return this.proxyService.deleteLink(id);
  }

  @Get('links/stats')
  @ApiOperation({ summary: '获取链接统计' })
  getLinkStats() {
    return this.proxyService.getLinkStats();
  }

  // Analytics
  @Get('analytics/summary')
  @ApiOperation({ summary: '获取分析概览' })
  getAnalyticsSummary() {
    return this.proxyService.getAnalyticsSummary();
  }

  @Get('analytics/links/:linkId')
  @ApiOperation({ summary: '获取链接分析' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getLinkAnalytics(
    @Param('linkId') linkId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.proxyService.getLinkAnalytics(linkId, { startDate, endDate });
  }

  @Get('analytics/teams/:teamId')
  @ApiOperation({ summary: '获取团队分析' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getTeamAnalytics(
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.proxyService.getTeamAnalytics(teamId, { startDate, endDate });
  }

  // Campaign Management
  @Get('campaigns')
  @ApiOperation({ summary: '获取营销活动列表' })
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'status', required: false })
  getCampaigns(@Query('teamId') teamId: string, @Query('status') status?: string) {
    return this.proxyService.getCampaigns(teamId, { status });
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: '获取营销活动详情' })
  getCampaign(@Param('id') id: string) {
    return this.proxyService.getCampaign(id);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: '删除营销活动' })
  deleteCampaign(@Param('id') id: string) {
    return this.proxyService.deleteCampaign(id);
  }

  // Page Management
  @Get('pages')
  @ApiOperation({ summary: '获取页面列表' })
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'status', required: false })
  getPages(@Query('teamId') teamId: string, @Query('status') status?: string) {
    return this.proxyService.getPages(teamId, { status });
  }

  @Get('pages/:id')
  @ApiOperation({ summary: '获取页面详情' })
  getPage(@Param('id') id: string) {
    return this.proxyService.getPage(id);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: '删除页面' })
  deletePage(@Param('id') id: string) {
    return this.proxyService.deletePage(id);
  }

  // Notifications
  @Post('notifications/broadcast')
  @ApiOperation({ summary: '发送广播通知' })
  sendBroadcast(@Body() data: { subject: string; body: string; recipients: string[] }) {
    return this.proxyService.sendBroadcast(data);
  }
}
