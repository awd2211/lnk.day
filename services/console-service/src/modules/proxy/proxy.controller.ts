import { Controller, Get, Post, Put, Delete, Patch, Param, Query, Body, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
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
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.proxyService.getUsers({ page, limit, search }, auth);
  }

  @Get('users/:id')
  @ApiOperation({ summary: '获取用户详情' })
  getUser(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getUser(id, auth);
  }

  @Put('users/:id')
  @ApiOperation({ summary: '更新用户' })
  updateUser(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateUser(id, data, auth);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: '删除用户' })
  deleteUser(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteUser(id, auth);
  }

  // Team Management
  @Get('teams')
  @ApiOperation({ summary: '获取团队列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTeams(@Headers('authorization') auth: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.getTeams({ page, limit }, auth);
  }

  @Get('teams/:id')
  @ApiOperation({ summary: '获取团队详情' })
  getTeam(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getTeam(id, auth);
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

  @Get('links/:id')
  @ApiOperation({ summary: '获取链接详情' })
  getLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getLink(id, auth);
  }

  @Delete('links/:id')
  @ApiOperation({ summary: '删除链接' })
  deleteLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteLink(id, auth);
  }

  @Get('links/stats')
  @ApiOperation({ summary: '获取链接统计' })
  getLinkStats(@Headers('authorization') auth: string) {
    return this.proxyService.getLinkStats(auth);
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
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'status', required: false })
  getCampaigns(@Headers('authorization') auth: string, @Query('teamId') teamId: string, @Query('status') status?: string) {
    return this.proxyService.getCampaigns(teamId, { status }, auth);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: '获取营销活动详情' })
  getCampaign(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getCampaign(id, auth);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: '删除营销活动' })
  deleteCampaign(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteCampaign(id, auth);
  }

  // Page Management
  @Get('pages')
  @ApiOperation({ summary: '获取页面列表' })
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'status', required: false })
  getPages(@Headers('authorization') auth: string, @Query('teamId') teamId: string, @Query('status') status?: string) {
    return this.proxyService.getPages(teamId, { status }, auth);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: '获取页面详情' })
  getPage(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getPage(id, auth);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: '删除页面' })
  deletePage(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deletePage(id, auth);
  }

  // Notifications
  @Post('notifications/broadcast')
  @ApiOperation({ summary: '发送广播通知' })
  sendBroadcast(@Headers('authorization') auth: string, @Body() data: { subject: string; body: string; recipients: string[] }) {
    return this.proxyService.sendBroadcast(data, auth);
  }

  // Extended User Management
  @Post('users/:id/suspend')
  @ApiOperation({ summary: '暂停用户' })
  suspendUser(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.suspendUser(id, data?.reason, auth);
  }

  @Post('users/:id/unsuspend')
  @ApiOperation({ summary: '恢复用户' })
  unsuspendUser(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unsuspendUser(id, auth);
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: '封禁用户' })
  banUser(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.banUser(id, data?.reason, auth);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: '重置用户密码' })
  resetUserPassword(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.resetUserPassword(id, auth);
  }

  // Extended Team Management
  @Put('teams/:id')
  @ApiOperation({ summary: '更新团队' })
  updateTeam(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateTeam(id, data, auth);
  }

  @Delete('teams/:id')
  @ApiOperation({ summary: '删除团队' })
  deleteTeam(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteTeam(id, auth);
  }

  @Post('teams/:id/suspend')
  @ApiOperation({ summary: '暂停团队' })
  suspendTeam(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.suspendTeam(id, data?.reason, auth);
  }

  @Post('teams/:id/unsuspend')
  @ApiOperation({ summary: '恢复团队' })
  unsuspendTeam(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unsuspendTeam(id, auth);
  }

  @Get('teams/:id/members')
  @ApiOperation({ summary: '获取团队成员' })
  getTeamMembers(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getTeamMembers(id, auth);
  }

  // Subscription Management
  @Get('subscriptions')
  @ApiOperation({ summary: '获取订阅列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'plan', required: false })
  getSubscriptions(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
  ) {
    return this.proxyService.getSubscriptions({ page, limit, status, plan }, auth);
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: '获取订阅详情' })
  getSubscription(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getSubscription(id, auth);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: '更新订阅状态' })
  updateSubscription(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { status?: string; plan?: string }) {
    return this.proxyService.updateSubscription(id, data, auth);
  }

  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: '取消订阅' })
  cancelSubscription(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string; immediate?: boolean }) {
    return this.proxyService.cancelSubscription(id, data, auth);
  }

  // Content Moderation
  @Get('moderation/reports')
  @ApiOperation({ summary: '获取举报列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  getModerationReports(
    @Headers('authorization') auth: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.proxyService.getModerationReports({ page, limit, status, type }, auth);
  }

  @Get('moderation/reports/:id')
  @ApiOperation({ summary: '获取举报详情' })
  getModerationReport(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getModerationReport(id, auth);
  }

  @Post('moderation/reports/:id/resolve')
  @ApiOperation({ summary: '处理举报' })
  resolveModerationReport(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { action: 'approve' | 'reject' | 'remove_content' | 'ban_user'; reason?: string },
  ) {
    return this.proxyService.resolveModerationReport(id, data, auth);
  }

  @Post('links/:id/flag')
  @ApiOperation({ summary: '标记链接为可疑' })
  flagLink(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.flagLink(id, data?.reason, auth);
  }

  @Post('links/:id/unflag')
  @ApiOperation({ summary: '取消链接标记' })
  unflagLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.unflagLink(id, auth);
  }

  // QR Code Management
  @Get('qrcodes')
  @ApiOperation({ summary: '获取二维码列表' })
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getQRCodes(
    @Headers('authorization') auth: string,
    @Query('teamId') teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getQRCodes(teamId, { page, limit }, auth);
  }

  @Get('qrcodes/:id')
  @ApiOperation({ summary: '获取二维码详情' })
  getQRCode(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getQRCode(id, auth);
  }

  @Delete('qrcodes/:id')
  @ApiOperation({ summary: '删除二维码' })
  deleteQRCode(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteQRCode(id, auth);
  }

  // Deep Link Management
  @Get('deeplinks')
  @ApiOperation({ summary: '获取深度链接列表' })
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getDeepLinks(
    @Headers('authorization') auth: string,
    @Query('teamId') teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.getDeepLinks(teamId, { page, limit }, auth);
  }

  @Get('deeplinks/:id')
  @ApiOperation({ summary: '获取深度链接详情' })
  getDeepLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.getDeepLink(id, auth);
  }

  @Delete('deeplinks/:id')
  @ApiOperation({ summary: '删除深度链接' })
  deleteDeepLink(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteDeepLink(id, auth);
  }

  // Domain Management
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
  updateDomain(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: { status?: string }) {
    return this.proxyService.updateDomain(id, data, auth);
  }

  @Delete('domains/:id')
  @ApiOperation({ summary: '删除域名' })
  deleteDomain(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteDomain(id, auth);
  }

  @Post('domains/:id/verify')
  @ApiOperation({ summary: '验证域名' })
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
  refundInvoice(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() data: { amount?: number; reason?: string },
  ) {
    return this.proxyService.refundInvoice(id, data, auth);
  }

  @Post('billing/invoices/:id/resend')
  @ApiOperation({ summary: '重新发送发票邮件' })
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
  @ApiOperation({ summary: '获取订阅计划列表' })
  getPlans(@Headers('authorization') auth: string) {
    return this.proxyService.getPlans(auth);
  }

  @Put('billing/plans/:id')
  @ApiOperation({ summary: '更新订阅计划' })
  updatePlan(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updatePlan(id, data, auth);
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
  revokeApiKey(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.proxyService.revokeApiKey(id, data?.reason, auth);
  }

  @Post('apikeys/:id/regenerate')
  @ApiOperation({ summary: '重新生成 API 密钥' })
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
  updateWebhook(@Headers('authorization') auth: string, @Param('id') id: string, @Body() data: any) {
    return this.proxyService.updateWebhook(id, data, auth);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: '删除 Webhook' })
  deleteWebhook(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.proxyService.deleteWebhook(id, auth);
  }

  @Post('webhooks/:id/test')
  @ApiOperation({ summary: '测试 Webhook' })
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
  exportUsers(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; filters?: any; fields?: string[] },
  ) {
    return this.proxyService.exportUsers(data, auth);
  }

  @Post('export/teams')
  @ApiOperation({ summary: '导出团队数据' })
  exportTeams(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; filters?: any; fields?: string[] },
  ) {
    return this.proxyService.exportTeams(data, auth);
  }

  @Post('export/links')
  @ApiOperation({ summary: '导出链接数据' })
  exportLinks(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; teamId?: string; filters?: any; fields?: string[] },
  ) {
    return this.proxyService.exportLinks(data, auth);
  }

  @Post('export/analytics')
  @ApiOperation({ summary: '导出分析数据' })
  exportAnalytics(
    @Headers('authorization') auth: string,
    @Body() data: { format?: string; startDate?: string; endDate?: string; teamId?: string; linkId?: string },
  ) {
    return this.proxyService.exportAnalytics(data, auth);
  }

  @Post('export/invoices')
  @ApiOperation({ summary: '导出发票数据' })
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
}
