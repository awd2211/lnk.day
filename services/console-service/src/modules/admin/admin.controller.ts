import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @ApiOperation({ summary: '管理员登录' })
  login(@Body() body: { email: string; password: string; rememberMe?: boolean }) {
    return this.adminService.login(body.email, body.password, body.rememberMe);
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
