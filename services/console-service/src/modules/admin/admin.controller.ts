import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @ApiOperation({ summary: '管理员登录' })
  login(@Body() body: { email: string; password: string; rememberMe?: boolean; twoFactorCode?: string }) {
    return this.adminService.login(body.email, body.password, body.rememberMe, body.twoFactorCode);
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

  // ==================== Profile Management (must be before :id routes) ====================

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前管理员信息' })
  getProfile(@Request() req: any) {
    return this.adminService.getProfile(req.user.sub);
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前管理员信息' })
  updateProfile(@Request() req: any, @Body() body: { name?: string; email?: string }) {
    return this.adminService.updateProfile(req.user.sub, body);
  }

  @Put('me/password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  changePassword(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.adminService.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  // ==================== Two-Factor Authentication ====================

  @Post('me/2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置双因素认证' })
  setupTwoFactor(@Request() req: any) {
    return this.adminService.setupTwoFactor(req.user.sub);
  }

  @Post('me/2fa/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '验证并启用双因素认证' })
  verifyTwoFactor(@Request() req: any, @Body() body: { code: string }) {
    return this.adminService.verifyAndEnableTwoFactor(req.user.sub, body.code);
  }

  @Delete('me/2fa')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '禁用双因素认证' })
  disableTwoFactor(@Request() req: any, @Body() body: { code: string }) {
    return this.adminService.disableTwoFactor(req.user.sub, body.code);
  }

  @Post('me/2fa/backup-codes')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '重新生成备用码' })
  regenerateBackupCodes(@Request() req: any, @Body() body: { code: string }) {
    return this.adminService.regenerateBackupCodes(req.user.sub, body.code);
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
  @ApiOperation({ summary: '创建管理员' })
  create(@Body() data: any) {
    return this.adminService.create(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新管理员' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.adminService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除管理员' })
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
