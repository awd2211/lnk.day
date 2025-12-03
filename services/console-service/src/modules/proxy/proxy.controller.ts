import { Controller, Get, Post, Put, Delete, Patch, Param, Query, Body, UseGuards, Headers, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, AuthenticatedUser } from '@lnk/nestjs-common';
import { ProxyService } from './proxy.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('proxy')
@Controller('proxy')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@UseInterceptors(AuditLogInterceptor)
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  // User Management
  @Get('users')
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  getUsers(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.proxyService.getUsers({ page, limit, search, sortBy, sortOrder }, auth);
  }

  @Get('users/:id')
  @ApiOperation({ summary: '获取用户详情' })
  getUser(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getUser(id, auth);
  }

  @Put('users/:id')
  @ApiOperation({ summary: '更新用户' })
  @LogAudit({
    action: 'proxy.user.update',
    targetType: 'user',
    targetIdParam: 'id',
    detailFields: ['name', 'email', 'status'],
  })
  updateUser(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateUser(id, data, auth);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: '删除用户' })
  @LogAudit({
    action: 'proxy.user.delete',
    targetType: 'user',
    targetIdParam: 'id',
  })
  deleteUser(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteUser(id, auth);
  }

  // Team Management
  @Get('teams')
  @ApiOperation({ summary: '获取团队列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  getTeams(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.proxyService.getTeams({ page, limit, sortBy, sortOrder }, auth);
  }

  @Get('teams/:id')
  @ApiOperation({ summary: '获取团队详情' })
  getTeam(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getTeam(id, auth);
  }

  @Patch('teams/:id/status')
  @ApiOperation({ summary: '更新团队状态' })
  @LogAudit({
    action: 'proxy.team.status.change',
    targetType: 'team',
    targetIdParam: 'id',
    detailFields: ['status'],
  })
  updateTeamStatus(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { status: 'active' | 'suspended' },
  ) {
    return this.proxyService.updateTeamStatus(id, data.status, auth);
  }

  // Link Management
  @Get('links')
  @ApiOperation({ summary: '获取链接列表' })
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  getLinks(
    @Headers('authorization') auth: string,
    @Query('teamId') teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.proxyService.getLinks(teamId, { page, limit, status }, auth);
  }

  @Get('links/stats')
  @ApiOperation({ summary: '获取链接统计' })
  getLinkStats(@Headers('authorization') auth: string) {
    return this.proxyService.getLinkStats(auth);
  }

  @Get('links/:id')
  @ApiOperation({ summary: '获取链接详情' })
  getLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getLink(id, auth);
  }

  @Delete('links/:id')
  @ApiOperation({ summary: '删除链接' })
  @LogAudit({
    action: 'proxy.link.delete',
    targetType: 'link',
    targetIdParam: 'id',
  })
  deleteLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteLink(id, auth);
  }

  // Analytics
  @Get('analytics/summary')
  @ApiOperation({ summary: '获取分析概览' })
  getAnalyticsSummary(@Headers('authorization') auth: string) {
    return this.proxyService.getAnalyticsSummary(auth);
  }

  @Get('analytics/links/:linkId')
  @ApiOperation({ summary: '获取链接分析' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getLinkAnalytics(
    @Headers('authorization') auth: string,
    @Param('linkId') linkId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.proxyService.getLinkAnalytics(linkId, { startDate, endDate }, auth);
  }

  @Get('analytics/teams/:teamId')
  @ApiOperation({ summary: '获取团队分析' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getTeamAnalytics(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.proxyService.getTeamAnalytics(teamId, { startDate, endDate }, auth);
  }

  // Campaign Management
  @Get('campaigns')
  @ApiOperation({ summary: '获取营销活动列表' })
  @ApiQuery({ name: 'teamId', required: false, description: '可选，不传则返回所有团队的活动' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getCampaigns(
    @Headers('authorization') auth: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getCampaigns(teamId, { status, page, limit }, auth);
  }

  @Get('campaigns/stats')
  @ApiOperation({ summary: '获取营销活动统计' })
  getCampaignStats(@Headers('authorization') auth: string) {
    return this.proxyService.getCampaignStats(auth);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: '获取营销活动详情' })
  getCampaign(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getCampaign(id, auth);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: '删除营销活动' })
  @LogAudit({
    action: 'proxy.campaign.delete',
    targetType: 'campaign',
    targetIdParam: 'id',
  })
  deleteCampaign(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteCampaign(id, auth);
  }

  @Post('campaigns/:id/suspend')
  @ApiOperation({ summary: '暂停营销活动' })
  @LogAudit({
    action: 'proxy.campaign.suspend',
    targetType: 'campaign',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  suspendCampaign(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.suspendCampaign(id, data.reason, auth);
  }

  @Post('campaigns/:id/resume')
  @ApiOperation({ summary: '恢复营销活动' })
  @LogAudit({
    action: 'proxy.campaign.resume',
    targetType: 'campaign',
    targetIdParam: 'id',
  })
  resumeCampaign(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.resumeCampaign(id, auth);
  }

  @Post('campaigns/:id/flag')
  @ApiOperation({ summary: '标记营销活动' })
  @LogAudit({
    action: 'proxy.campaign.flag',
    targetType: 'campaign',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  flagCampaign(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.flagCampaign(id, data.reason, auth);
  }

  // Page Management
  @Get('pages')
  @ApiOperation({ summary: '获取页面列表' })
  @ApiQuery({ name: 'teamId', required: false, description: '可选，不传则返回所有团队的页面' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPages(
    @Headers('authorization') auth: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getPages(teamId, { status, page, limit }, auth);
  }

  @Get('pages/stats')
  @ApiOperation({ summary: '获取页面统计' })
  getPageStats(@Headers('authorization') auth: string) {
    return this.proxyService.getPageStats(auth);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: '获取页面详情' })
  getPage(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getPage(id, auth);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: '删除页面' })
  @LogAudit({
    action: 'proxy.page.delete',
    targetType: 'page',
    targetIdParam: 'id',
  })
  deletePage(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deletePage(id, auth);
  }

  @Post('pages/:id/block')
  @ApiOperation({ summary: '封禁页面' })
  @LogAudit({
    action: 'proxy.page.block',
    targetType: 'page',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  blockPage(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.blockPage(id, data.reason, auth);
  }

  @Post('pages/:id/unblock')
  @ApiOperation({ summary: '解封页面' })
  @LogAudit({
    action: 'proxy.page.unblock',
    targetType: 'page',
    targetIdParam: 'id',
  })
  unblockPage(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unblockPage(id, auth);
  }

  @Post('pages/:id/flag')
  @ApiOperation({ summary: '标记页面' })
  @LogAudit({
    action: 'proxy.page.flag',
    targetType: 'page',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  flagPage(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.flagPage(id, data.reason, auth);
  }

  // Notifications
  @Post('notifications/broadcast')
  @ApiOperation({ summary: '发送广播通知' })
  @LogAudit({
    action: 'proxy.notification.broadcast',
    targetType: 'notification',
    detailFields: ['subject', 'recipients'],
  })
  sendBroadcast(@Headers('authorization') auth: string, @Body() data: { subject: string; body: string; recipients: string[] }) {
    return this.proxyService.sendBroadcast(data, auth);
  }

  // Extended User Management
  @Patch('users/:id/status')
  @ApiOperation({ summary: '更新用户状态' })
  @LogAudit({
    action: 'proxy.user.status.change',
    targetType: 'user',
    targetIdParam: 'id',
    detailFields: ['status'],
  })
  toggleUserStatus(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { status: 'active' | 'disabled' },
  ) {
    if (data.status === 'disabled') {
      return this.proxyService.suspendUser(id, undefined, auth);
    } else {
      return this.proxyService.unsuspendUser(id, auth);
    }
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: '暂停用户' })
  @LogAudit({
    action: 'proxy.user.suspend',
    targetType: 'user',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  suspendUser(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.suspendUser(id, data?.reason, auth);
  }

  @Post('users/:id/unsuspend')
  @ApiOperation({ summary: '恢复用户' })
  @LogAudit({
    action: 'proxy.user.unsuspend',
    targetType: 'user',
    targetIdParam: 'id',
  })
  unsuspendUser(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unsuspendUser(id, auth);
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: '封禁用户' })
  @LogAudit({
    action: 'proxy.user.ban',
    targetType: 'user',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  banUser(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.banUser(id, data?.reason, auth);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: '重置用户密码' })
  @LogAudit({
    action: 'proxy.user.password.reset',
    targetType: 'user',
    targetIdParam: 'id',
  })
  resetUserPassword(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.resetUserPassword(id, auth);
  }

  @Post('users/bulk-delete')
  @ApiOperation({ summary: '批量删除用户' })
  @LogAudit({
    action: 'proxy.user.bulk.delete',
    targetType: 'user',
    detailFields: ['ids'],
  })
  bulkDeleteUsers(@Headers('authorization') auth: string, @Body() data: { ids: string[] }) {
    return this.proxyService.bulkDeleteUsers(data.ids, auth);
  }

  @Post('users/bulk-status')
  @ApiOperation({ summary: '批量更新用户状态' })
  @LogAudit({
    action: 'proxy.user.bulk.status',
    targetType: 'user',
    detailFields: ['ids', 'status'],
  })
  bulkToggleStatus(
    @Headers('authorization') auth: string,
    @Body() data: { ids: string[]; status: 'active' | 'disabled' },
  ) {
    return this.proxyService.bulkToggleStatus(data.ids, data.status, auth);
  }

  @Post('users/:id/force-logout')
  @ApiOperation({ summary: '强制用户登出' })
  @LogAudit({
    action: 'proxy.user.force.logout',
    targetType: 'user',
    targetIdParam: 'id',
  })
  forceLogout(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.forceLogout(id, auth);
  }

  @Get('users/:id/login-history')
  @ApiOperation({ summary: '获取用户登录历史' })
  getUserLoginHistory(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getUserLoginHistory(id, auth);
  }

  @Get('users/:id/activity')
  @ApiOperation({ summary: '获取用户活动记录' })
  getUserActivity(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getUserActivity(id, auth);
  }

  // Extended Team Management
  @Put('teams/:id')
  @ApiOperation({ summary: '更新团队' })
  @LogAudit({
    action: 'proxy.team.update',
    targetType: 'team',
    targetIdParam: 'id',
    detailFields: ['name', 'description'],
  })
  updateTeam(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateTeam(id, data, auth);
  }

  @Delete('teams/:id')
  @ApiOperation({ summary: '删除团队' })
  @LogAudit({
    action: 'proxy.team.delete',
    targetType: 'team',
    targetIdParam: 'id',
  })
  deleteTeam(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteTeam(id, auth);
  }

  @Post('teams/:id/suspend')
  @ApiOperation({ summary: '暂停团队' })
  @LogAudit({
    action: 'proxy.team.suspend',
    targetType: 'team',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  suspendTeam(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.suspendTeam(id, data?.reason, auth);
  }

  @Post('teams/:id/unsuspend')
  @ApiOperation({ summary: '恢复团队' })
  @LogAudit({
    action: 'proxy.team.unsuspend',
    targetType: 'team',
    targetIdParam: 'id',
  })
  unsuspendTeam(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unsuspendTeam(id, auth);
  }

  @Get('teams/:id/members')
  @ApiOperation({ summary: '获取团队成员' })
  getTeamMembers(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getTeamMembers(id, auth);
  }

  @Delete('teams/:teamId/members/:memberId')
  @ApiOperation({ summary: '移除团队成员' })
  @LogAudit({
    action: 'proxy.team.member.remove',
    targetType: 'team_member',
    targetIdParam: 'memberId',
    getTarget: (_, args) => {
      const req = args[0]?.params;
      return req ? { id: req.memberId, name: `Team: ${req.teamId}` } : null;
    },
  })
  removeTeamMember(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.proxyService.removeTeamMember(teamId, memberId, auth);
  }

  @Patch('teams/:id/quota')
  @ApiOperation({ summary: '更新团队配额' })
  @LogAudit({
    action: 'proxy.team.quota.update',
    targetType: 'team',
    targetIdParam: 'id',
    logRequestBody: true,
  })
  updateTeamQuota(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() quota: any,
  ) {
    return this.proxyService.updateTeamQuota(id, quota, auth);
  }

  // Subscription Management
  @Get('subscriptions/stats')
  @ApiOperation({ summary: '获取订阅统计' })
  getSubscriptionStats(@Headers('authorization') auth: string) {
    return this.proxyService.getSubscriptionStats(auth);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: '获取订阅列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'plan', required: false })
  @ApiQuery({ name: 'search', required: false })
  getSubscriptions(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getSubscriptions({ page, limit, status, plan, search }, auth);
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: '获取订阅详情' })
  getSubscription(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getSubscription(id, auth);
  }

  @Patch('subscriptions/:id/plan')
  @ApiOperation({ summary: '更改订阅计划' })
  @LogAudit({
    action: 'proxy.subscription.plan.change',
    targetType: 'subscription',
    targetIdParam: 'id',
    detailFields: ['plan', 'billingCycle'],
  })
  changeSubscriptionPlan(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { plan: string; billingCycle?: 'monthly' | 'annual' },
  ) {
    return this.proxyService.changeSubscriptionPlan(id, data, auth);
  }

  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: '取消订阅' })
  @LogAudit({
    action: 'proxy.subscription.cancel',
    targetType: 'subscription',
    targetIdParam: 'id',
    detailFields: ['immediately', 'reason'],
  })
  cancelSubscription(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data?: { immediately?: boolean; reason?: string },
  ) {
    return this.proxyService.cancelSubscription(id, data, auth);
  }

  @Post('subscriptions/:id/reactivate')
  @ApiOperation({ summary: '重新激活订阅' })
  @LogAudit({
    action: 'proxy.subscription.reactivate',
    targetType: 'subscription',
    targetIdParam: 'id',
  })
  reactivateSubscription(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.reactivateSubscription(id, auth);
  }

  @Post('subscriptions/:id/extend-trial')
  @ApiOperation({ summary: '延长试用期' })
  @LogAudit({
    action: 'proxy.subscription.trial.extend',
    targetType: 'subscription',
    targetIdParam: 'id',
    detailFields: ['days'],
  })
  extendSubscriptionTrial(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { days: number },
  ) {
    return this.proxyService.extendSubscriptionTrial(id, data, auth);
  }

  @Get('subscriptions/:id/invoices')
  @ApiOperation({ summary: '获取订阅发票列表' })
  getSubscriptionInvoices(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getSubscriptionInvoices(id, auth);
  }

  @Post('subscriptions/:id/invoices/:invoiceId/refund')
  @ApiOperation({ summary: '退款发票' })
  @LogAudit({
    action: 'proxy.subscription.invoice.refund',
    targetType: 'invoice',
    targetIdParam: 'invoiceId',
    detailFields: ['amount', 'reason'],
  })
  refundSubscriptionInvoice(
    @Headers('authorization') auth: string,
    @Param('id') subscriptionId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() data?: { amount?: number; reason?: string },
  ) {
    return this.proxyService.refundSubscriptionInvoice(subscriptionId, invoiceId, data, auth);
  }

  // Content Moderation
  @Get('moderation/stats')
  @ApiOperation({ summary: '获取审核统计' })
  getModerationStats(@Headers('authorization') auth: string) {
    return this.proxyService.getModerationStats(auth);
  }

  @Get('moderation/flagged-links')
  @ApiOperation({ summary: '获取标记链接列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'reason', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'search', required: false })
  getFlaggedLinks(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('reason') reason?: string,
    @Query('severity') severity?: string,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getFlaggedLinks({ page, limit, status, reason, severity, search }, auth);
  }

  @Get('moderation/flagged-links/:id')
  @ApiOperation({ summary: '获取标记链接详情' })
  getFlaggedLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getFlaggedLink(id, auth);
  }

  @Get('moderation/flagged-links/:id/reports')
  @ApiOperation({ summary: '获取链接举报记录' })
  getLinkReports(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getLinkReports(id, auth);
  }

  @Post('moderation/flagged-links/:id/approve')
  @ApiOperation({ summary: '通过审核' })
  @LogAudit({
    action: 'proxy.moderation.link.approve',
    targetType: 'flagged_link',
    targetIdParam: 'id',
    detailFields: ['note'],
  })
  approveFlaggedLink(
    @Headers('authorization') auth: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data?: { note?: string },
  ) {
    return this.proxyService.approveFlaggedLink(id, data, user.sub, user.email || '', auth);
  }

  @Post('moderation/flagged-links/:id/block')
  @ApiOperation({ summary: '封禁链接' })
  @LogAudit({
    action: 'proxy.moderation.link.block',
    targetType: 'flagged_link',
    targetIdParam: 'id',
    detailFields: ['note', 'blockUser'],
  })
  blockFlaggedLink(
    @Headers('authorization') auth: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() data?: { note?: string; blockUser?: boolean },
  ) {
    return this.proxyService.blockFlaggedLink(id, data, user.sub, user.email || '', auth);
  }

  @Post('moderation/flagged-links/bulk-approve')
  @ApiOperation({ summary: '批量通过审核' })
  @LogAudit({
    action: 'proxy.moderation.link.bulk.approve',
    targetType: 'flagged_link',
    detailFields: ['ids', 'note'],
  })
  bulkApproveFlaggedLinks(
    @Headers('authorization') auth: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: { ids: string[]; note?: string },
  ) {
    return this.proxyService.bulkApproveFlaggedLinks(data, user.sub, user.email || '', auth);
  }

  @Post('moderation/flagged-links/bulk-block')
  @ApiOperation({ summary: '批量封禁链接' })
  @LogAudit({
    action: 'proxy.moderation.link.bulk.block',
    targetType: 'flagged_link',
    detailFields: ['ids', 'note', 'blockUsers'],
  })
  bulkBlockFlaggedLinks(
    @Headers('authorization') auth: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: { ids: string[]; note?: string; blockUsers?: boolean },
  ) {
    return this.proxyService.bulkBlockFlaggedLinks(data, user.sub, user.email || '', auth);
  }

  @Get('moderation/blocked-users')
  @ApiOperation({ summary: '获取被封禁用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getBlockedUsers(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getBlockedUsers({ page, limit }, auth);
  }

  @Post('moderation/users/:userId/block')
  @ApiOperation({ summary: '封禁用户' })
  @LogAudit({
    action: 'proxy.moderation.user.block',
    targetType: 'user',
    targetIdParam: 'userId',
    detailFields: ['reason'],
  })
  blockModerationUser(
    @Headers('authorization') auth: string,
    @Param('userId') userId: string,
    @Body() data?: { reason?: string },
  ) {
    return this.proxyService.blockModerationUser(userId, data, auth);
  }

  @Post('moderation/users/:userId/unblock')
  @ApiOperation({ summary: '解封用户' })
  @LogAudit({
    action: 'proxy.moderation.user.unblock',
    targetType: 'user',
    targetIdParam: 'userId',
  })
  unblockModerationUser(@Headers('authorization') auth: string, @Param('userId') userId: string) {
    return this.proxyService.unblockModerationUser(userId, auth);
  }

  @Get('moderation/settings')
  @ApiOperation({ summary: '获取审核设置' })
  getModerationSettings(@Headers('authorization') auth: string) {
    return this.proxyService.getModerationSettings(auth);
  }

  @Put('moderation/settings')
  @ApiOperation({ summary: '更新审核设置' })
  @LogAudit({
    action: 'proxy.moderation.settings.update',
    targetType: 'moderation_settings',
    logRequestBody: true,
  })
  updateModerationSettings(@Headers('authorization') auth: string, @Body() data: any) {
    return this.proxyService.updateModerationSettings(data, auth);
  }

  @Post('links/:id/flag')
  @ApiOperation({ summary: '标记链接为可疑' })
  @LogAudit({
    action: 'proxy.link.flag',
    targetType: 'link',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  flagLink(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.flagLink(id, data?.reason, auth);
  }

  @Post('links/:id/unflag')
  @ApiOperation({ summary: '取消链接标记' })
  @LogAudit({
    action: 'proxy.link.unflag',
    targetType: 'link',
    targetIdParam: 'id',
  })
  unflagLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unflagLink(id, auth);
  }

  @Post('links/:id/block')
  @ApiOperation({ summary: '封禁链接' })
  @LogAudit({
    action: 'proxy.link.block',
    targetType: 'link',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  blockLink(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.blockLink(id, data.reason, auth);
  }

  @Post('links/:id/unblock')
  @ApiOperation({ summary: '解封链接' })
  @LogAudit({
    action: 'proxy.link.unblock',
    targetType: 'link',
    targetIdParam: 'id',
  })
  unblockLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unblockLink(id, auth);
  }

  // QR Code Management
  @Get('qrcodes')
  @ApiOperation({ summary: '获取二维码列表' })
  @ApiQuery({ name: 'teamId', required: false, description: '可选，不传则返回所有团队的二维码' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'style', required: false })
  getQRCodes(
    @Headers('authorization') auth: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('style') style?: string,
  ) {
    return this.proxyService.getQRCodes(teamId, { page, limit, style }, auth);
  }

  @Get('qrcodes/stats')
  @ApiOperation({ summary: '获取二维码统计' })
  getQRCodeStats(@Headers('authorization') auth: string) {
    return this.proxyService.getQRCodeStats(auth);
  }

  @Get('qrcodes/:id')
  @ApiOperation({ summary: '获取二维码详情' })
  getQRCode(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getQRCode(id, auth);
  }

  @Delete('qrcodes/:id')
  @ApiOperation({ summary: '删除二维码' })
  @LogAudit({
    action: 'proxy.qrcode.delete',
    targetType: 'qrcode',
    targetIdParam: 'id',
  })
  deleteQRCode(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteQRCode(id, auth);
  }

  @Post('qrcodes/:id/block')
  @ApiOperation({ summary: '封禁二维码' })
  @LogAudit({
    action: 'proxy.qrcode.block',
    targetType: 'qrcode',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  blockQRCode(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.blockQRCode(id, data.reason, auth);
  }

  @Post('qrcodes/:id/unblock')
  @ApiOperation({ summary: '解封二维码' })
  @LogAudit({
    action: 'proxy.qrcode.unblock',
    targetType: 'qrcode',
    targetIdParam: 'id',
  })
  unblockQRCode(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unblockQRCode(id, auth);
  }

  @Post('qrcodes/:id/flag')
  @ApiOperation({ summary: '标记二维码' })
  @LogAudit({
    action: 'proxy.qrcode.flag',
    targetType: 'qrcode',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  flagQRCode(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.flagQRCode(id, data.reason, auth);
  }

  // Deep Link Management
  @Get('deeplinks')
  @ApiOperation({ summary: '获取深度链接列表' })
  @ApiQuery({ name: 'teamId', required: false, description: '可选，不传则返回所有团队的深度链接' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  getDeepLinks(
    @Headers('authorization') auth: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.proxyService.getDeepLinks(teamId, { page, limit, status }, auth);
  }

  @Get('deeplinks/stats')
  @ApiOperation({ summary: '获取深度链接统计' })
  getDeepLinkStats(@Headers('authorization') auth: string) {
    return this.proxyService.getDeepLinkStats(auth);
  }

  @Get('deeplinks/:id')
  @ApiOperation({ summary: '获取深度链接详情' })
  getDeepLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getDeepLink(id, auth);
  }

  @Delete('deeplinks/:id')
  @ApiOperation({ summary: '删除深度链接' })
  @LogAudit({
    action: 'proxy.deeplink.delete',
    targetType: 'deeplink',
    targetIdParam: 'id',
  })
  deleteDeepLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteDeepLink(id, auth);
  }

  @Post('deeplinks/:id/block')
  @ApiOperation({ summary: '封禁深度链接' })
  @LogAudit({
    action: 'proxy.deeplink.block',
    targetType: 'deeplink',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  blockDeepLink(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.blockDeepLink(id, data.reason, auth);
  }

  @Post('deeplinks/:id/unblock')
  @ApiOperation({ summary: '解封深度链接' })
  @LogAudit({
    action: 'proxy.deeplink.unblock',
    targetType: 'deeplink',
    targetIdParam: 'id',
  })
  unblockDeepLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unblockDeepLink(id, auth);
  }

  @Post('deeplinks/:id/flag')
  @ApiOperation({ summary: '标记深度链接' })
  @LogAudit({
    action: 'proxy.deeplink.flag',
    targetType: 'deeplink',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  flagDeepLink(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { reason: string }) {
    return this.proxyService.flagDeepLink(id, data.reason, auth);
  }

  // Domain Management
  @Get('domains/stats')
  @ApiOperation({ summary: '获取域名统计' })
  getDomainStats(@Headers('authorization') auth: string) {
    return this.proxyService.getDomainStats(auth);
  }

  @Get('domains')
  @ApiOperation({ summary: '获取域名列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  getDomains(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.proxyService.getDomains({ page, limit, status }, auth);
  }

  @Get('domains/:id')
  @ApiOperation({ summary: '获取域名详情' })
  getDomain(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getDomain(id, auth);
  }

  @Patch('domains/:id')
  @ApiOperation({ summary: '更新域名状态' })
  @LogAudit({
    action: 'proxy.domain.update',
    targetType: 'domain',
    targetIdParam: 'id',
    detailFields: ['status'],
  })
  updateDomain(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { status?: string }) {
    return this.proxyService.updateDomain(id, data, auth);
  }

  @Delete('domains/:id')
  @ApiOperation({ summary: '删除域名' })
  @LogAudit({
    action: 'proxy.domain.delete',
    targetType: 'domain',
    targetIdParam: 'id',
  })
  deleteDomain(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteDomain(id, auth);
  }

  @Post('domains/:id/verify')
  @ApiOperation({ summary: '验证域名' })
  @LogAudit({
    action: 'proxy.domain.verify',
    targetType: 'domain',
    targetIdParam: 'id',
  })
  verifyDomain(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.verifyDomain(id, auth);
  }

  // ==================== Billing / Invoices ====================
  @Get('billing/invoices')
  @ApiOperation({ summary: '获取发票列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'status', required: false })
  getInvoices(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
  ) {
    return this.proxyService.getInvoices({ page, limit, teamId, status }, auth);
  }

  @Get('billing/invoices/:id')
  @ApiOperation({ summary: '获取发票详情' })
  getInvoice(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getInvoice(id, auth);
  }

  @Post('billing/invoices/:id/refund')
  @ApiOperation({ summary: '退款' })
  @LogAudit({
    action: 'proxy.invoice.refund',
    targetType: 'invoice',
    targetIdParam: 'id',
    detailFields: ['amount', 'reason'],
  })
  refundInvoice(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { amount?: number; reason?: string },
  ) {
    return this.proxyService.refundInvoice(id, data, auth);
  }

  @Post('billing/invoices/:id/resend')
  @ApiOperation({ summary: '重新发送发票邮件' })
  @LogAudit({
    action: 'proxy.invoice.resend',
    targetType: 'invoice',
    targetIdParam: 'id',
  })
  resendInvoice(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.resendInvoice(id, auth);
  }

  @Get('billing/revenue')
  @ApiOperation({ summary: '获取收入统计' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false, description: 'day|week|month' })
  getRevenue(
    @Headers('authorization') auth: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.proxyService.getRevenue({ startDate, endDate, groupBy }, auth);
  }

  @Get('billing/plans')
  @ApiOperation({ summary: '获取订阅计划列表 (旧版)' })
  getBillingPlans(@Headers('authorization') auth: string) {
    return this.proxyService.getBillingPlans(auth);
  }

  @Put('billing/plans/:id')
  @ApiOperation({ summary: '更新订阅计划 (旧版)' })
  @LogAudit({
    action: 'proxy.billing.plan.update',
    targetType: 'billing_plan',
    targetIdParam: 'id',
    logRequestBody: true,
  })
  updateBillingPlan(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateBillingPlan(id, data, auth);
  }

  // ==================== API Keys ====================
  @Get('apikeys')
  @ApiOperation({ summary: '获取 API 密钥列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false })
  getApiKeys(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.proxyService.getApiKeys({ page, limit, teamId, userId, status }, auth);
  }

  @Get('apikeys/:id')
  @ApiOperation({ summary: '获取 API 密钥详情' })
  getApiKey(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getApiKey(id, auth);
  }

  @Post('apikeys/:id/revoke')
  @ApiOperation({ summary: '撤销 API 密钥' })
  @LogAudit({
    action: 'proxy.apikey.revoke',
    targetType: 'api_key',
    targetIdParam: 'id',
    detailFields: ['reason'],
  })
  revokeApiKey(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.revokeApiKey(id, data?.reason, auth);
  }

  @Post('apikeys/:id/regenerate')
  @ApiOperation({ summary: '重新生成 API 密钥' })
  @LogAudit({
    action: 'proxy.apikey.regenerate',
    targetType: 'api_key',
    targetIdParam: 'id',
  })
  regenerateApiKey(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.regenerateApiKey(id, auth);
  }

  @Get('apikeys/usage')
  @ApiOperation({ summary: '获取 API 使用统计' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'keyId', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  getApiKeyUsage(
    @Headers('authorization') auth: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyId') keyId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.proxyService.getApiKeyUsage({ startDate, endDate, keyId, teamId }, auth);
  }

  // ==================== Webhooks ====================
  @Get('webhooks/stats')
  @ApiOperation({ summary: '获取 Webhook 统计' })
  getWebhookStats(@Headers('authorization') auth: string) {
    return this.proxyService.getWebhookStats(auth);
  }

  @Get('webhooks')
  @ApiOperation({ summary: '获取 Webhook 列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'status', required: false })
  getWebhooks(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
  ) {
    return this.proxyService.getWebhooks({ page, limit, teamId, status }, auth);
  }

  @Get('webhooks/:id')
  @ApiOperation({ summary: '获取 Webhook 详情' })
  getWebhook(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getWebhook(id, auth);
  }

  @Put('webhooks/:id')
  @ApiOperation({ summary: '更新 Webhook' })
  @LogAudit({
    action: 'proxy.webhook.update',
    targetType: 'webhook',
    targetIdParam: 'id',
    detailFields: ['url', 'events', 'name'],
  })
  updateWebhook(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateWebhook(id, data, auth);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: '删除 Webhook' })
  @LogAudit({
    action: 'proxy.webhook.delete',
    targetType: 'webhook',
    targetIdParam: 'id',
  })
  deleteWebhook(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteWebhook(id, auth);
  }

  @Post('webhooks/:id/test')
  @ApiOperation({ summary: '测试 Webhook' })
  @LogAudit({
    action: 'proxy.webhook.test',
    targetType: 'webhook',
    targetIdParam: 'id',
  })
  testWebhook(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.testWebhook(id, auth);
  }

  @Get('webhooks/:id/logs')
  @ApiOperation({ summary: '获取 Webhook 调用日志' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getWebhookLogs(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getWebhookLogs(id, { page, limit }, auth);
  }

  @Post('webhooks/:id/retry')
  @ApiOperation({ summary: '重试 Webhook' })
  @LogAudit({
    action: 'proxy.webhook.retry',
    targetType: 'webhook',
    targetIdParam: 'id',
    detailFields: ['logId'],
  })
  retryWebhook(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { logId: string }) {
    return this.proxyService.retryWebhook(id, data.logId, auth);
  }

  // ==================== Data Export ====================
  @Post('export/users')
  @ApiOperation({ summary: '导出用户数据' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['csv', 'json', 'xlsx'] },
        filters: { type: 'object' },
        fields: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @LogAudit({
    action: 'proxy.export.users',
    targetType: 'export',
    detailFields: ['format', 'fields'],
  })
  exportUsers(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; filters?: any; fields?: string[] },
  ) {
    return this.proxyService.exportUsers(data, auth);
  }

  @Post('export/teams')
  @ApiOperation({ summary: '导出团队数据' })
  @LogAudit({
    action: 'proxy.export.teams',
    targetType: 'export',
    detailFields: ['format', 'fields'],
  })
  exportTeams(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; filters?: any; fields?: string[] },
  ) {
    return this.proxyService.exportTeams(data, auth);
  }

  @Post('export/links')
  @ApiOperation({ summary: '导出链接数据' })
  @LogAudit({
    action: 'proxy.export.links',
    targetType: 'export',
    detailFields: ['format', 'teamId', 'fields'],
  })
  exportLinks(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; teamId?: string; filters?: any; fields?: string[] },
  ) {
    return this.proxyService.exportLinks(data, auth);
  }

  @Post('export/analytics')
  @ApiOperation({ summary: '导出分析数据' })
  @LogAudit({
    action: 'proxy.export.analytics',
    targetType: 'export',
    detailFields: ['format', 'startDate', 'endDate', 'teamId', 'linkId'],
  })
  exportAnalytics(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; startDate?: string; endDate?: string; teamId?: string; linkId?: string },
  ) {
    return this.proxyService.exportAnalytics(data, auth);
  }

  @Post('export/invoices')
  @ApiOperation({ summary: '导出发票数据' })
  @LogAudit({
    action: 'proxy.export.invoices',
    targetType: 'export',
    detailFields: ['format', 'startDate', 'endDate', 'status'],
  })
  exportInvoices(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; startDate?: string; endDate?: string; status?: string },
  ) {
    return this.proxyService.exportInvoices(data, auth);
  }

  @Get('export/jobs')
  @ApiOperation({ summary: '获取导出任务列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getExportJobs(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getExportJobs({ page, limit }, auth);
  }

  @Get('export/jobs/:id')
  @ApiOperation({ summary: '获取导出任务状态' })
  getExportJob(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getExportJob(id, auth);
  }

  @Get('export/jobs/:id/download')
  @ApiOperation({ summary: '下载导出文件' })
  downloadExport(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.downloadExport(id, auth);
  }

  // ==================== Role Management ====================
  @Get('teams/:teamId/roles')
  @ApiOperation({ summary: '获取团队角色列表' })
  getTeamRoles(@Headers('authorization') auth: string, @Param('teamId') teamId: string) {
    return this.proxyService.getTeamRoles(teamId, auth);
  }

  @Get('teams/:teamId/roles/permissions')
  @ApiOperation({ summary: '获取所有可用权限' })
  getAvailablePermissions(@Headers('authorization') auth: string, @Param('teamId') teamId: string) {
    return this.proxyService.getAvailablePermissions(teamId, auth);
  }

  @Get('teams/:teamId/roles/:roleId')
  @ApiOperation({ summary: '获取单个角色详情' })
  getTeamRole(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.proxyService.getTeamRole(teamId, roleId, auth);
  }

  @Post('teams/:teamId/roles')
  @ApiOperation({ summary: '创建自定义角色' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'permissions'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
        isDefault: { type: 'boolean' },
      },
    },
  })
  @LogAudit({
    action: 'proxy.team.role.create',
    targetType: 'team_role',
    targetIdParam: 'teamId',
    detailFields: ['name', 'permissions'],
  })
  createTeamRole(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Body() data: { name: string; description?: string; color?: string; permissions: string[]; isDefault?: boolean },
  ) {
    return this.proxyService.createTeamRole(teamId, data, auth);
  }

  @Put('teams/:teamId/roles/:roleId')
  @ApiOperation({ summary: '更新角色' })
  @LogAudit({
    action: 'proxy.team.role.update',
    targetType: 'team_role',
    targetIdParam: 'roleId',
    detailFields: ['name', 'permissions'],
  })
  updateTeamRole(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @Body() data: { name?: string; description?: string; color?: string; permissions?: string[]; isDefault?: boolean },
  ) {
    return this.proxyService.updateTeamRole(teamId, roleId, data, auth);
  }

  @Delete('teams/:teamId/roles/:roleId')
  @ApiOperation({ summary: '删除角色' })
  @LogAudit({
    action: 'proxy.team.role.delete',
    targetType: 'team_role',
    targetIdParam: 'roleId',
  })
  deleteTeamRole(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.proxyService.deleteTeamRole(teamId, roleId, auth);
  }

  @Post('teams/:teamId/roles/:roleId/duplicate')
  @ApiOperation({ summary: '复制角色' })
  @LogAudit({
    action: 'proxy.team.role.duplicate',
    targetType: 'team_role',
    targetIdParam: 'roleId',
    detailFields: ['name'],
  })
  duplicateTeamRole(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @Body() data: { name: string },
  ) {
    return this.proxyService.duplicateTeamRole(teamId, roleId, data.name, auth);
  }

  @Post('teams/:teamId/roles/initialize')
  @ApiOperation({ summary: '初始化默认角色' })
  @LogAudit({
    action: 'proxy.team.role.initialize',
    targetType: 'team',
    targetIdParam: 'teamId',
  })
  initializeDefaultRoles(@Headers('authorization') auth: string, @Param('teamId') teamId: string) {
    return this.proxyService.initializeDefaultRoles(teamId, auth);
  }

  @Put('teams/:teamId/members/:memberId')
  @ApiOperation({ summary: '更新团队成员角色' })
  @LogAudit({
    action: 'proxy.team.member.role.update',
    targetType: 'team_member',
    targetIdParam: 'memberId',
    detailFields: ['role', 'customRoleId'],
  })
  updateTeamMember(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() data: { role?: string; customRoleId?: string },
  ) {
    return this.proxyService.updateTeamMemberRole(teamId, memberId, data, auth);
  }

  // ==================== Integration Management ====================
  @Get('integrations/stats')
  @ApiOperation({ summary: '获取集成统计' })
  getIntegrationStats(@Headers('authorization') auth: string) {
    return this.proxyService.getIntegrationStats(auth);
  }

  @Get('integrations')
  @ApiOperation({ summary: '获取集成列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  getIntegrations(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getIntegrations({ page, limit, type, status, search }, auth);
  }

  @Get('integrations/:id')
  @ApiOperation({ summary: '获取集成详情' })
  getIntegration(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getIntegration(id, auth);
  }

  @Put('integrations/:id/config')
  @ApiOperation({ summary: '更新集成配置' })
  @LogAudit({
    action: 'proxy.integration.config.update',
    targetType: 'integration',
    targetIdParam: 'id',
    logRequestBody: true,
    excludeFields: ['apiKey', 'secret', 'token', 'password'],
  })
  updateIntegrationConfig(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() config: Record<string, any>,
  ) {
    return this.proxyService.updateIntegrationConfig(id, config, auth);
  }

  @Post('integrations/:id/sync')
  @ApiOperation({ summary: '触发集成同步' })
  @LogAudit({
    action: 'proxy.integration.sync.trigger',
    targetType: 'integration',
    targetIdParam: 'id',
  })
  triggerIntegrationSync(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.triggerIntegrationSync(id, auth);
  }

  @Patch('integrations/:id/sync')
  @ApiOperation({ summary: '开关自动同步' })
  @LogAudit({
    action: 'proxy.integration.sync.toggle',
    targetType: 'integration',
    targetIdParam: 'id',
    detailFields: ['enabled'],
  })
  toggleIntegrationSync(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { enabled: boolean },
  ) {
    return this.proxyService.toggleIntegrationSync(id, data.enabled, auth);
  }

  @Post('integrations/:id/disconnect')
  @ApiOperation({ summary: '断开集成连接' })
  @LogAudit({
    action: 'proxy.integration.disconnect',
    targetType: 'integration',
    targetIdParam: 'id',
  })
  disconnectIntegration(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.disconnectIntegration(id, auth);
  }

  @Get('integrations/:id/logs')
  @ApiOperation({ summary: '获取集成同步日志' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getIntegrationSyncLogs(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getIntegrationSyncLogs(id, { page, limit }, auth);
  }

  // ==================== Notification Management ====================
  @Get('notifications/stats')
  @ApiOperation({ summary: '获取通知统计' })
  getNotificationStats(@Headers('authorization') auth: string) {
    return this.proxyService.getNotificationStats(auth);
  }

  @Get('notifications/logs')
  @ApiOperation({ summary: '获取通知发送记录' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  getNotificationLogs(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getNotificationLogs({ page, limit, type, status, search }, auth);
  }

  @Get('notifications/logs/:id')
  @ApiOperation({ summary: '获取通知详情' })
  getNotificationLog(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getNotificationLog(id, auth);
  }

  @Post('notifications/logs/:id/resend')
  @ApiOperation({ summary: '重新发送通知' })
  @LogAudit({
    action: 'proxy.notification.resend',
    targetType: 'notification',
    targetIdParam: 'id',
  })
  resendNotification(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.resendNotification(id, auth);
  }

  @Post('notifications/broadcast')
  @ApiOperation({ summary: '发送广播通知' })
  @LogAudit({
    action: 'proxy.notification.broadcast',
    targetType: 'notification',
    detailFields: ['subject', 'type'],
  })
  sendNotificationBroadcast(
    @Headers('authorization') auth: string,
    @Body() data: { subject: string; content: string; type: string },
  ) {
    return this.proxyService.sendNotificationBroadcast(data, auth);
  }

  // Notification Templates
  @Get('notifications/templates')
  @ApiOperation({ summary: '获取通知模板列表' })
  @ApiQuery({ name: 'type', required: false })
  getNotificationTemplates(
    @Headers('authorization') auth: string,
    @Query('type') type?: string,
  ) {
    return this.proxyService.getNotificationTemplates({ type }, auth);
  }

  @Get('notifications/templates/:id')
  @ApiOperation({ summary: '获取通知模板详情' })
  getNotificationTemplate(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getNotificationTemplate(id, auth);
  }

  @Put('notifications/templates/:id')
  @ApiOperation({ summary: '更新通知模板' })
  @LogAudit({
    action: 'proxy.notification.template.update',
    targetType: 'notification_template',
    targetIdParam: 'id',
    detailFields: ['subject', 'name'],
  })
  updateNotificationTemplate(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.proxyService.updateNotificationTemplate(id, data, auth);
  }

  @Post('notifications/templates/:id/reset')
  @ApiOperation({ summary: '重置通知模板为默认' })
  @LogAudit({
    action: 'proxy.notification.template.reset',
    targetType: 'notification_template',
    targetIdParam: 'id',
  })
  resetNotificationTemplate(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.resetNotificationTemplate(id, auth);
  }

  // Notification Channels
  @Get('notifications/channels')
  @ApiOperation({ summary: '获取通知渠道列表' })
  getNotificationChannels(@Headers('authorization') auth: string) {
    return this.proxyService.getNotificationChannels(auth);
  }

  @Post('notifications/channels')
  @ApiOperation({ summary: '创建通知渠道' })
  @LogAudit({
    action: 'proxy.notification.channel.create',
    targetType: 'notification_channel',
    detailFields: ['name', 'type'],
    excludeFields: ['apiKey', 'secret', 'token', 'password'],
  })
  createNotificationChannel(
    @Headers('authorization') auth: string,
    @Body() data: any,
  ) {
    return this.proxyService.createNotificationChannel(data, auth);
  }

  @Get('notifications/channels/:id')
  @ApiOperation({ summary: '获取通知渠道详情' })
  getNotificationChannel(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getNotificationChannel(id, auth);
  }

  @Put('notifications/channels/:id')
  @ApiOperation({ summary: '更新通知渠道配置' })
  @LogAudit({
    action: 'proxy.notification.channel.update',
    targetType: 'notification_channel',
    targetIdParam: 'id',
    detailFields: ['name', 'type'],
    excludeFields: ['apiKey', 'secret', 'token', 'password'],
  })
  updateNotificationChannel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.proxyService.updateNotificationChannel(id, data, auth);
  }

  @Patch('notifications/channels/:id')
  @ApiOperation({ summary: '开关通知渠道' })
  @LogAudit({
    action: 'proxy.notification.channel.toggle',
    targetType: 'notification_channel',
    targetIdParam: 'id',
    detailFields: ['enabled'],
  })
  toggleNotificationChannel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { enabled: boolean },
  ) {
    return this.proxyService.toggleNotificationChannel(id, data.enabled, auth);
  }

  @Post('notifications/channels/:id/test')
  @ApiOperation({ summary: '测试通知渠道' })
  @LogAudit({
    action: 'proxy.notification.channel.test',
    targetType: 'notification_channel',
    targetIdParam: 'id',
    detailFields: ['recipient'],
  })
  testNotificationChannel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data?: { recipient?: string },
  ) {
    return this.proxyService.testNotificationChannel(id, data?.recipient, auth);
  }

  // ==================== SSO Configuration ====================
  @Get('sso/stats')
  @ApiOperation({ summary: '获取 SSO 统计' })
  getSsoStats(@Headers('authorization') auth: string) {
    return this.proxyService.getSsoStats(auth);
  }

  @Get('sso')
  @ApiOperation({ summary: '获取 SSO 配置列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  getSsoConfigs(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.proxyService.getSsoConfigs({ page, limit, type, status }, auth);
  }

  @Get('sso/:id')
  @ApiOperation({ summary: '获取 SSO 配置详情' })
  getSsoConfig(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getSsoConfig(id, auth);
  }

  @Post('sso')
  @ApiOperation({ summary: '创建 SSO 配置' })
  @LogAudit({
    action: 'proxy.sso.create',
    targetType: 'sso_config',
    detailFields: ['name', 'type', 'provider'],
    excludeFields: ['clientSecret', 'privateKey', 'certificate'],
  })
  createSsoConfig(@Headers('authorization') auth: string, @Body() data: any) {
    return this.proxyService.createSsoConfig(data, auth);
  }

  @Put('sso/:id')
  @ApiOperation({ summary: '更新 SSO 配置' })
  @LogAudit({
    action: 'proxy.sso.update',
    targetType: 'sso_config',
    targetIdParam: 'id',
    detailFields: ['name', 'type', 'provider'],
    excludeFields: ['clientSecret', 'privateKey', 'certificate'],
  })
  updateSsoConfig(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateSsoConfig(id, data, auth);
  }

  @Delete('sso/:id')
  @ApiOperation({ summary: '删除 SSO 配置' })
  @LogAudit({
    action: 'proxy.sso.delete',
    targetType: 'sso_config',
    targetIdParam: 'id',
  })
  deleteSsoConfig(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteSsoConfig(id, auth);
  }

  @Post('sso/:id/test')
  @ApiOperation({ summary: '测试 SSO 配置' })
  @LogAudit({
    action: 'proxy.sso.test',
    targetType: 'sso_config',
    targetIdParam: 'id',
  })
  testSsoConfig(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.testSsoConfig(id, auth);
  }

  @Patch('sso/:id/toggle')
  @ApiOperation({ summary: '启用/禁用 SSO 配置' })
  @LogAudit({
    action: 'proxy.sso.toggle',
    targetType: 'sso_config',
    targetIdParam: 'id',
    detailFields: ['enabled'],
  })
  toggleSsoConfig(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { enabled: boolean },
  ) {
    return this.proxyService.toggleSsoConfig(id, data.enabled, auth);
  }

  // ==================== Security Scan ====================
  @Get('security/stats')
  @ApiOperation({ summary: '获取安全扫描统计' })
  getSecurityStats(@Headers('authorization') auth: string) {
    return this.proxyService.getSecurityStats(auth);
  }

  @Get('security/scans')
  @ApiOperation({ summary: '获取安全扫描记录列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'threatLevel', required: false })
  @ApiQuery({ name: 'search', required: false })
  getSecurityScans(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('threatLevel') threatLevel?: string,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getSecurityScans({ page, limit, status, threatLevel, search }, auth);
  }

  @Get('security/scans/:id')
  @ApiOperation({ summary: '获取安全扫描详情' })
  getSecurityScan(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getSecurityScan(id, auth);
  }

  @Post('security/scans')
  @ApiOperation({ summary: '触发安全扫描' })
  @LogAudit({
    action: 'proxy.security.scan.trigger',
    targetType: 'security_scan',
    detailFields: ['linkId'],
  })
  triggerSecurityScan(@Headers('authorization') auth: string, @Body() data: { linkId: string }) {
    return this.proxyService.triggerSecurityScan(data.linkId, auth);
  }

  @Get('security/blacklist')
  @ApiOperation({ summary: '获取黑名单列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  getSecurityBlacklist(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getSecurityBlacklist({ page, limit, type, search }, auth);
  }

  @Post('security/blacklist')
  @ApiOperation({ summary: '添加到黑名单' })
  @LogAudit({
    action: 'proxy.security.blacklist.add',
    targetType: 'blacklist',
    detailFields: ['pattern', 'type', 'reason'],
  })
  addToBlacklist(@Headers('authorization') auth: string, @Body() data: { pattern: string; type: string; reason?: string }) {
    return this.proxyService.addToBlacklist(data, auth);
  }

  @Delete('security/blacklist/:id')
  @ApiOperation({ summary: '从黑名单移除' })
  @LogAudit({
    action: 'proxy.security.blacklist.remove',
    targetType: 'blacklist',
    targetIdParam: 'id',
  })
  removeFromBlacklist(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.removeFromBlacklist(id, auth);
  }

  @Get('security/events')
  @ApiOperation({ summary: '获取安全事件列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'type', required: false })
  getSecurityEvents(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('severity') severity?: string,
    @Query('type') type?: string,
  ) {
    return this.proxyService.getSecurityEvents({ page, limit, severity, type }, auth);
  }

  // ==================== A/B Tests ====================
  @Get('ab-tests/stats')
  @ApiOperation({ summary: '获取 A/B 测试统计' })
  getAbTestStats(@Headers('authorization') auth: string) {
    return this.proxyService.getAbTestStats(auth);
  }

  @Get('ab-tests')
  @ApiOperation({ summary: '获取 A/B 测试列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  getAbTests(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.proxyService.getAbTests({ page, limit, status, teamId }, auth);
  }

  @Get('ab-tests/:id')
  @ApiOperation({ summary: '获取 A/B 测试详情' })
  getAbTest(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getAbTest(id, auth);
  }

  @Get('ab-tests/:id/results')
  @ApiOperation({ summary: '获取 A/B 测试结果' })
  getAbTestResults(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getAbTestResults(id, auth);
  }

  @Post('ab-tests/:id/stop')
  @ApiOperation({ summary: '停止 A/B 测试' })
  @LogAudit({
    action: 'proxy.abtest.stop',
    targetType: 'ab_test',
    targetIdParam: 'id',
  })
  stopAbTest(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.stopAbTest(id, auth);
  }

  @Post('ab-tests/:id/winner')
  @ApiOperation({ summary: '宣布 A/B 测试获胜者' })
  @LogAudit({
    action: 'proxy.abtest.winner.declare',
    targetType: 'ab_test',
    targetIdParam: 'id',
    detailFields: ['variantId'],
  })
  declareAbTestWinner(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { variantId: string },
  ) {
    return this.proxyService.declareAbTestWinner(id, data.variantId, auth);
  }

  // ==================== Goals & Conversions ====================
  @Get('goals/stats')
  @ApiOperation({ summary: '获取目标统计' })
  getGoalStats(@Headers('authorization') auth: string) {
    return this.proxyService.getGoalStats(auth);
  }

  @Get('goals')
  @ApiOperation({ summary: '获取目标列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  getGoals(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.proxyService.getGoals({ page, limit, status, type, teamId }, auth);
  }

  @Get('goals/:id')
  @ApiOperation({ summary: '获取目标详情' })
  getGoal(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getGoal(id, auth);
  }

  @Get('goals/:id/funnel')
  @ApiOperation({ summary: '获取目标漏斗分析' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getGoalFunnel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.proxyService.getGoalFunnel(id, { startDate, endDate }, auth);
  }

  @Get('goals/:id/conversions')
  @ApiOperation({ summary: '获取目标转化记录' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getGoalConversions(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.proxyService.getGoalConversions(id, { page, limit, startDate, endDate }, auth);
  }

  @Get('goals/rankings')
  @ApiOperation({ summary: '获取目标排行榜' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'period', required: false })
  getGoalRankings(
    @Headers('authorization') auth: string,
    @Query('limit') limit?: number,
    @Query('period') period?: string,
  ) {
    return this.proxyService.getGoalRankings({ limit, period }, auth);
  }

  // ==================== Redirect Rules ====================
  @Get('redirect-rules/stats')
  @ApiOperation({ summary: '获取重定向规则统计' })
  getRedirectRuleStats(@Headers('authorization') auth: string) {
    return this.proxyService.getRedirectRuleStats(auth);
  }

  @Get('redirect-rules')
  @ApiOperation({ summary: '获取重定向规则列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  getRedirectRules(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.proxyService.getRedirectRules({ page, limit, status, type, teamId }, auth);
  }

  @Get('redirect-rules/conflicts')
  @ApiOperation({ summary: '获取重定向规则冲突' })
  getRedirectRuleConflicts(@Headers('authorization') auth: string) {
    return this.proxyService.getRedirectRuleConflicts(auth);
  }

  @Get('redirect-rules/:id')
  @ApiOperation({ summary: '获取重定向规则详情' })
  getRedirectRule(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getRedirectRule(id, auth);
  }

  @Patch('redirect-rules/:id/toggle')
  @ApiOperation({ summary: '启用/禁用重定向规则' })
  @LogAudit({
    action: 'proxy.redirect.rule.toggle',
    targetType: 'redirect_rule',
    targetIdParam: 'id',
    detailFields: ['enabled'],
  })
  toggleRedirectRule(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { enabled: boolean },
  ) {
    return this.proxyService.toggleRedirectRule(id, data.enabled, auth);
  }

  @Post('redirect-rules/:id/test')
  @ApiOperation({ summary: '测试重定向规则' })
  testRedirectRule(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() testData: { userAgent?: string; ip?: string; referer?: string; country?: string },
  ) {
    return this.proxyService.testRedirectRule(id, testData, auth);
  }

  // ==================== Platform Tags ====================
  @Get('tags/stats')
  @ApiOperation({ summary: '获取标签统计' })
  getTagStats(@Headers('authorization') auth: string) {
    return this.proxyService.getTagStats(auth);
  }

  @Get('tags/popular')
  @ApiOperation({ summary: '获取热门标签' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPopularTags(
    @Headers('authorization') auth: string,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getPopularTags({ limit }, auth);
  }

  @Get('tags')
  @ApiOperation({ summary: '获取平台标签列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  getPlatformTags(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.proxyService.getPlatformTags({ page, limit, search, category }, auth);
  }

  @Post('tags')
  @ApiOperation({ summary: '创建平台标签' })
  @LogAudit({
    action: 'proxy.tag.create',
    targetType: 'platform_tag',
    detailFields: ['name', 'color', 'category'],
  })
  createPlatformTag(
    @Headers('authorization') auth: string,
    @Body() data: { name: string; color?: string; category?: string; description?: string },
  ) {
    return this.proxyService.createPlatformTag(data, auth);
  }

  @Put('tags/:id')
  @ApiOperation({ summary: '更新平台标签' })
  @LogAudit({
    action: 'proxy.tag.update',
    targetType: 'platform_tag',
    targetIdParam: 'id',
    detailFields: ['name', 'color', 'category'],
  })
  updatePlatformTag(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { name?: string; color?: string; category?: string; description?: string },
  ) {
    return this.proxyService.updatePlatformTag(id, data, auth);
  }

  @Delete('tags/:id')
  @ApiOperation({ summary: '删除平台标签' })
  @LogAudit({
    action: 'proxy.tag.delete',
    targetType: 'platform_tag',
    targetIdParam: 'id',
  })
  deletePlatformTag(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deletePlatformTag(id, auth);
  }

  // ==================== Folders ====================
  @Get('folders/stats')
  @ApiOperation({ summary: '获取文件夹统计' })
  getFolderStats(@Headers('authorization') auth: string) {
    return this.proxyService.getFolderStats(auth);
  }

  @Get('folders')
  @ApiOperation({ summary: '获取文件夹列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  getFolders(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('teamId') teamId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.proxyService.getFolders({ page, limit, teamId, search, sortBy, sortOrder }, auth);
  }

  // ==================== Realtime Analytics ====================
  @Get('realtime/stats')
  @ApiOperation({ summary: '获取实时平台统计' })
  getRealtimePlatformStats(@Headers('authorization') auth: string) {
    return this.proxyService.getRealtimePlatformStats(auth);
  }

  @Get('realtime/hot-links')
  @ApiOperation({ summary: '获取实时热门链接' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'period', required: false })
  getRealtimeHotLinks(
    @Headers('authorization') auth: string,
    @Query('limit') limit?: number,
    @Query('period') period?: string,
  ) {
    return this.proxyService.getRealtimeHotLinks({ limit, period }, auth);
  }

  @Get('realtime/map')
  @ApiOperation({ summary: '获取实时地理分布' })
  getRealtimeMap(@Headers('authorization') auth: string) {
    return this.proxyService.getRealtimeMap(auth);
  }

  @Get('realtime/timeline')
  @ApiOperation({ summary: '获取实时时间线数据' })
  @ApiQuery({ name: 'minutes', required: false, type: Number })
  @ApiQuery({ name: 'interval', required: false })
  getRealtimeTimeline(
    @Headers('authorization') auth: string,
    @Query('minutes') minutes?: number,
    @Query('interval') interval?: string,
  ) {
    return this.proxyService.getRealtimeTimeline({ minutes, interval }, auth);
  }

  // ==================== Comments Management ====================
  @Get('comments/stats')
  @ApiOperation({ summary: '获取评论统计' })
  getCommentsStats(@Headers('authorization') auth: string) {
    return this.proxyService.getCommentsStats(auth);
  }

  @Get('comments')
  @ApiOperation({ summary: '获取评论列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  getComments(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getComments({ page, limit, status, search }, auth);
  }

  @Post('comments/:id/moderate')
  @ApiOperation({ summary: '审核评论' })
  @LogAudit({
    action: 'proxy.comment.moderate',
    targetType: 'comment',
    targetIdParam: 'id',
    detailFields: ['action', 'reason'],
  })
  moderateComment(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { action: 'approve' | 'reject' | 'spam'; reason?: string },
  ) {
    return this.proxyService.moderateComment(id, data, auth);
  }

  @Post('comments/batch-moderate')
  @ApiOperation({ summary: '批量审核评论' })
  @LogAudit({
    action: 'proxy.comment.batch.moderate',
    targetType: 'comment',
    detailFields: ['ids', 'action'],
  })
  batchModerateComments(
    @Headers('authorization') auth: string,
    @Body() data: { ids: string[]; action: 'approve' | 'reject' | 'spam' },
  ) {
    return this.proxyService.batchModerateComments(data, auth);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '删除评论' })
  @LogAudit({
    action: 'proxy.comment.delete',
    targetType: 'comment',
    targetIdParam: 'id',
  })
  deleteComment(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteComment(id, auth);
  }

  // ==================== SEO Management ====================
  @Get('seo/settings')
  @ApiOperation({ summary: '获取SEO设置' })
  getSeoSettings(@Headers('authorization') auth: string) {
    return this.proxyService.getSeoSettings(auth);
  }

  @Put('seo/settings')
  @ApiOperation({ summary: '更新SEO设置' })
  @LogAudit({
    action: 'proxy.seo.settings.update',
    targetType: 'seo_settings',
    logRequestBody: true,
  })
  updateSeoSettings(@Headers('authorization') auth: string, @Body() data: any) {
    return this.proxyService.updateSeoSettings(data, auth);
  }

  @Get('seo/pages')
  @ApiOperation({ summary: '获取页面SEO列表' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false })
  getSeoPages(
    @Headers('authorization') auth: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.proxyService.getSeoPages({ search, type }, auth);
  }

  @Put('seo/pages/:id')
  @ApiOperation({ summary: '更新页面SEO' })
  @LogAudit({
    action: 'proxy.seo.page.update',
    targetType: 'seo_page',
    targetIdParam: 'id',
    detailFields: ['title', 'description', 'keywords'],
  })
  updatePageSeo(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.proxyService.updatePageSeo(id, data, auth);
  }

  @Get('seo/issues')
  @ApiOperation({ summary: '获取SEO问题列表' })
  getSeoIssues(@Headers('authorization') auth: string) {
    return this.proxyService.getSeoIssues(auth);
  }

  @Get('seo/stats')
  @ApiOperation({ summary: '获取SEO统计' })
  getSeoStats(@Headers('authorization') auth: string) {
    return this.proxyService.getSeoStats(auth);
  }

  @Post('seo/optimize')
  @ApiOperation({ summary: '批量优化SEO' })
  @LogAudit({
    action: 'proxy.seo.batch.optimize',
    targetType: 'seo',
  })
  batchOptimizeSeo(@Headers('authorization') auth: string) {
    return this.proxyService.batchOptimizeSeo(auth);
  }

  // ==================== Security Management (Settings, Sessions, IP Blocking) ====================
  @Get('security/settings')
  @ApiOperation({ summary: '获取安全设置' })
  getSecuritySettings(@Headers('authorization') auth: string) {
    return this.proxyService.getSecuritySettings(auth);
  }

  @Put('security/settings')
  @ApiOperation({ summary: '更新安全设置' })
  @LogAudit({
    action: 'proxy.security.settings.update',
    targetType: 'security_settings',
    logRequestBody: true,
    excludeFields: ['password', 'secret', 'apiKey'],
  })
  updateSecuritySettings(@Headers('authorization') auth: string, @Body() data: any) {
    return this.proxyService.updateSecuritySettings(data, auth);
  }

  @Get('security/blocked-ips')
  @ApiOperation({ summary: '获取封禁IP列表' })
  getBlockedIps(@Headers('authorization') auth: string) {
    return this.proxyService.getBlockedIps(auth);
  }

  @Post('security/blocked-ips')
  @ApiOperation({ summary: '添加封禁IP' })
  @LogAudit({
    action: 'proxy.security.ip.block',
    targetType: 'blocked_ip',
    detailFields: ['ip', 'reason', 'permanent'],
  })
  addBlockedIp(
    @Headers('authorization') auth: string,
    @Body() data: { ip: string; reason: string; permanent: boolean },
  ) {
    return this.proxyService.addBlockedIp(data, auth);
  }

  @Delete('security/blocked-ips/:id')
  @ApiOperation({ summary: '解封IP' })
  @LogAudit({
    action: 'proxy.security.ip.unblock',
    targetType: 'blocked_ip',
    targetIdParam: 'id',
  })
  removeBlockedIp(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.removeBlockedIp(id, auth);
  }

  @Get('security/sessions')
  @ApiOperation({ summary: '获取活跃会话' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  getActiveSessions(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getActiveSessions({ page, limit, userId, search }, auth);
  }

  @Delete('security/sessions/:id')
  @ApiOperation({ summary: '终止会话' })
  @LogAudit({
    action: 'proxy.security.session.terminate',
    targetType: 'session',
    targetIdParam: 'id',
  })
  terminateSession(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.terminateSession(id, auth);
  }

  @Get('security/platform-stats')
  @ApiOperation({ summary: '获取平台安全统计' })
  getPlatformSecurityStats(@Headers('authorization') auth: string) {
    return this.proxyService.getPlatformSecurityStats(auth);
  }

  @Get('security/platform-events')
  @ApiOperation({ summary: '获取平台安全事件' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'severity', required: false, type: String })
  getPlatformSecurityEvents(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
  ) {
    return this.proxyService.getPlatformSecurityEvents({ page, limit, userId, type, severity }, auth);
  }

  // ==================== Plan Management ====================
  @Get('plans/stats')
  @ApiOperation({ summary: '获取套餐统计' })
  getPlanStats(@Headers('authorization') auth: string) {
    return this.proxyService.getPlanStats(auth);
  }

  @Get('plans')
  @ApiOperation({ summary: '获取所有套餐' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  getPlans(
    @Headers('authorization') auth: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.proxyService.getPlans(includeInactive === 'true', auth);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: '获取套餐详情' })
  getPlan(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getPlan(id, auth);
  }

  @Post('plans')
  @ApiOperation({ summary: '创建套餐' })
  @LogAudit({
    action: 'proxy.plan.create',
    targetType: 'plan',
    getTarget: (result) => result ? { id: result.id, name: result.name || result.code } : null,
    detailFields: ['code', 'name', 'price', 'billingCycle'],
  })
  createPlan(@Headers('authorization') auth: string, @Body() data: any) {
    return this.proxyService.createPlan(data, auth);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: '更新套餐' })
  @LogAudit({
    action: 'proxy.plan.update',
    targetType: 'plan',
    targetIdParam: 'id',
    logRequestBody: true,
  })
  updatePlan(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.proxyService.updatePlan(id, data, auth);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: '删除套餐' })
  @LogAudit({
    action: 'proxy.plan.delete',
    targetType: 'plan',
    targetIdParam: 'id',
  })
  deletePlan(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deletePlan(id, auth);
  }

  @Patch('plans/:id/toggle')
  @ApiOperation({ summary: '切换套餐激活状态' })
  @LogAudit({
    action: 'proxy.plan.toggle',
    targetType: 'plan',
    targetIdParam: 'id',
  })
  togglePlanActive(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.togglePlanActive(id, auth);
  }

  @Post('plans/:id/duplicate')
  @ApiOperation({ summary: '复制套餐' })
  @LogAudit({
    action: 'proxy.plan.duplicate',
    targetType: 'plan',
    targetIdParam: 'id',
    detailFields: ['code', 'name'],
  })
  duplicatePlan(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { code: string; name: string },
  ) {
    return this.proxyService.duplicatePlan(id, data, auth);
  }

  @Put('plans/sort-order')
  @ApiOperation({ summary: '更新套餐排序' })
  @LogAudit({
    action: 'proxy.plan.sort.update',
    targetType: 'plan',
    logRequestBody: true,
  })
  updatePlanSortOrder(
    @Headers('authorization') auth: string,
    @Body() orders: { id: string; sortOrder: number }[],
  ) {
    return this.proxyService.updatePlanSortOrder(orders, auth);
  }

  @Post('plans/refresh-cache')
  @ApiOperation({ summary: '刷新套餐缓存' })
  @LogAudit({
    action: 'proxy.plan.cache.refresh',
    targetType: 'plan',
  })
  refreshPlanCache(@Headers('authorization') auth: string) {
    return this.proxyService.refreshPlanCache(auth);
  }

  // ==================== Quota Management ====================
  @Get('quotas/stats')
  @ApiOperation({ summary: '获取配额统计' })
  getQuotaStats(@Headers('authorization') auth: string) {
    return this.proxyService.getQuotaStats(auth);
  }

  @Get('quotas')
  @ApiOperation({ summary: '获取团队配额列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'plan', required: false })
  getQuotas(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('plan') plan?: string,
  ) {
    return this.proxyService.getQuotas({ page, limit, search, plan }, auth);
  }

  @Get('quotas/:teamId')
  @ApiOperation({ summary: '获取团队配额详情' })
  getTeamQuota(@Headers('authorization') auth: string, @Param('teamId') teamId: string) {
    return this.proxyService.getTeamQuota(teamId, auth);
  }

  @Put('quotas/:teamId')
  @ApiOperation({ summary: '更新团队配额 (管理员)' })
  @LogAudit({
    action: 'proxy.quota.update',
    targetType: 'team_quota',
    targetIdParam: 'teamId',
    logRequestBody: true,
  })
  updateTeamQuotaAdmin(
    @Headers('authorization') auth: string,
    @Param('teamId') teamId: string,
    @Body() data: any,
  ) {
    return this.proxyService.updateTeamQuotaAdmin(teamId, data, auth);
  }

  @Post('quotas/:teamId/reset')
  @ApiOperation({ summary: '重置团队配额' })
  @LogAudit({
    action: 'proxy.quota.reset',
    targetType: 'team_quota',
    targetIdParam: 'teamId',
  })
  resetTeamQuota(@Headers('authorization') auth: string, @Param('teamId') teamId: string) {
    return this.proxyService.resetTeamQuota(teamId, auth);
  }
}
