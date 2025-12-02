import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('admin')
@Controller('admin')
@UseInterceptors(AuditLogInterceptor)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @ApiOperation({ summary: '管理员登录（密码方式）' })
  @LogAudit({
    action: 'admin.login',
    targetType: 'admin',
    getTarget: (result) => result?.admin ? { id: result.admin.id, name: result.admin.name } : null,
    detailFields: ['email'],
    excludeFields: ['password', 'twoFactorCode'],
  })
  login(@Body() body: { email: string; password: string; rememberMe?: boolean; twoFactorCode?: string }) {
    return this.adminService.login(body.email, body.password, body.rememberMe, body.twoFactorCode);
  }

  @Post('login/send-code')
  @ApiOperation({ summary: '发送登录验证码' })
  sendLoginCode(@Body() body: { email: string }) {
    return this.adminService.sendLoginCode(body.email);
  }

  @Post('login/code')
  @ApiOperation({ summary: '验证码登录' })
  @LogAudit({
    action: 'admin.login.code',
    targetType: 'admin',
    getTarget: (result) => result?.admin ? { id: result.admin.id, name: result.admin.name } : null,
    detailFields: ['email'],
    excludeFields: ['code'],
  })
  loginWithCode(@Body() body: { email: string; code: string; rememberMe?: boolean }) {
    return this.adminService.loginWithCode(body.email, body.code, body.rememberMe);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: '忘记密码' })
  forgotPassword(@Body() body: { email: string }) {
    return this.adminService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: '重置密码' })
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.adminService.resetPassword(body.token, body.password);
  }

  @Post('invite/validate')
  @ApiOperation({ summary: '验证邀请链接' })
  validateInvite(@Body() body: { token: string }) {
    return this.adminService.validateInviteToken(body.token);
  }

  @Post('invite/accept')
  @ApiOperation({ summary: '接受邀请并设置密码' })
  acceptInvite(@Body() body: { token: string; password: string }) {
    return this.adminService.acceptInvite(body.token, body.password);
  }

  // ==================== Profile Management (must be before :id routes) ====================

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前管理员信息' })
  getProfile(@Request() req: any) {
    // JWT strategy 返回 id 而不是 sub
    return this.adminService.getProfile(req.user.id);
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前管理员基本信息（不包含邮箱）' })
  updateProfile(@Request() req: any, @Body() body: { name?: string }) {
    return this.adminService.updateProfile(req.user.id, body);
  }

  @Put('me/password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  @LogAudit({
    action: 'admin.password.change',
    targetType: 'admin',
    excludeFields: ['currentPassword', 'newPassword'],
  })
  changePassword(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.adminService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  // ==================== Two-Factor Authentication ====================

  @Post('me/2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置双因素认证' })
  setupTwoFactor(@Request() req: any) {
    return this.adminService.setupTwoFactor(req.user.id);
  }

  @Post('me/2fa/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '验证并启用双因素认证' })
  @LogAudit({
    action: 'admin.2fa.enable',
    targetType: 'admin',
    excludeFields: ['code'],
  })
  verifyTwoFactor(@Request() req: any, @Body() body: { code: string }) {
    return this.adminService.verifyAndEnableTwoFactor(req.user.id, body.code);
  }

  @Delete('me/2fa')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '禁用双因素认证' })
  @LogAudit({
    action: 'admin.2fa.disable',
    targetType: 'admin',
    excludeFields: ['code'],
  })
  disableTwoFactor(@Request() req: any, @Body() body: { code: string }) {
    return this.adminService.disableTwoFactor(req.user.id, body.code);
  }

  @Post('me/2fa/backup-codes')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '重新生成备用码' })
  regenerateBackupCodes(@Request() req: any, @Body() body: { code: string }) {
    return this.adminService.regenerateBackupCodes(req.user.id, body.code);
  }

  // ==================== Email Verification ====================

  @Post('me/email/send-verification')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '发送邮箱验证邮件（验证当前邮箱）' })
  sendEmailVerification(@Request() req: any) {
    return this.adminService.sendEmailVerification(req.user.id);
  }

  @Post('email/verify')
  @ApiOperation({ summary: '验证邮箱（通过链接中的 token）' })
  verifyEmail(@Body() body: { token: string }) {
    return this.adminService.verifyEmail(body.token);
  }

  // ==================== Secure Email Change Flow ====================

  @Post('me/email/request-change')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '步骤1: 请求更换邮箱（发送验证码到当前邮箱）' })
  requestEmailChange(@Request() req: any, @Body() body: { newEmail: string }) {
    return this.adminService.requestEmailChange(req.user.id, body.newEmail);
  }

  @Post('me/email/verify-old')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '步骤2: 验证当前邮箱验证码' })
  verifyOldEmailForChange(@Request() req: any, @Body() body: { code: string }) {
    return this.adminService.verifyOldEmailForChange(req.user.id, body.code);
  }

  @Post('me/email/resend-code')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '重新发送邮箱更换验证码（到当前邮箱）' })
  resendEmailChangeCode(@Request() req: any) {
    return this.adminService.resendEmailChangeCode(req.user.id);
  }

  @Post('me/email/resend-new-verification')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '重新发送新邮箱验证邮件' })
  resendNewEmailVerification(@Request() req: any) {
    return this.adminService.resendNewEmailVerification(req.user.id);
  }

  @Delete('me/email/pending')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消待验证的邮箱更换' })
  cancelPendingEmailChange(@Request() req: any) {
    return this.adminService.cancelPendingEmailChange(req.user.id);
  }

  // ==================== Admin CRUD (parameterized routes must be last) ====================

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取管理员列表' })
  findAll() {
    return this.adminService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取管理员详情' })
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '邀请管理员' })
  @LogAudit({
    action: 'admin.invite',
    targetType: 'admin',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['email', 'name', 'roleId'],
  })
  invite(@Body() data: { email: string; name: string; roleId: string }) {
    return this.adminService.invite(data);
  }

  @Post(':id/resend-invite')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '重发邀请邮件' })
  @LogAudit({
    action: 'admin.invite.resend',
    targetType: 'admin',
    targetIdParam: 'id',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
  })
  resendInvite(@Param('id') id: string) {
    return this.adminService.resendInvite(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新管理员' })
  @LogAudit({
    action: 'admin.update',
    targetType: 'admin',
    targetIdParam: 'id',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'roleId', 'status'],
    excludeFields: ['password'],
  })
  update(@Param('id') id: string, @Body() data: any) {
    return this.adminService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除管理员' })
  @LogAudit({
    action: 'admin.delete',
    targetType: 'admin',
    targetIdParam: 'id',
  })
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
