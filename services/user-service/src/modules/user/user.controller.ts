import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@lnk/nestjs-common';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: '创建用户' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有用户' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.userService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const userData = await this.userService.findOne(user.id);
    // 对于没有团队的用户，使用 userId 作为个人工作区的 teamId
    // 这与 JWT scope.teamId 的逻辑保持一致
    return {
      ...userData,
      teamId: userData.teamId || userData.id,
    };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前用户信息' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(user.id, updateUserDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个用户' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除用户' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: '密码修改成功' };
  }

  @Post('check-password-strength')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '检查密码强度' })
  checkPasswordStrength(@Body() body: { password: string }) {
    return this.userService.checkPasswordStrength(body.password);
  }

  // ========== 邮箱验证 API ==========

  @Post('send-verification-email')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发送邮箱验证邮件' })
  async sendVerificationEmail(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.sendEmailVerification(user.id);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证邮箱' })
  @ApiQuery({ name: 'token', description: '验证 token', required: true })
  async verifyEmail(@Query('token') token: string) {
    return this.userService.verifyEmail(token);
  }

  // ========== 内部服务 API ==========

  @Get('internal/validate/:id')
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: '内部服务验证用户 (供其他微服务调用)' })
  @ApiHeader({ name: 'x-internal-api-key', description: '内部 API 密钥', required: true })
  async internalValidateUser(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
    };
  }

  @Get('internal/by-email/:email')
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: '内部服务通过邮箱查询用户' })
  @ApiHeader({ name: 'x-internal-api-key', description: '内部 API 密钥', required: true })
  async internalFindByEmail(@Param('email') email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
    };
  }

  @Post('internal/:id/suspend')
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '内部服务封禁用户' })
  @ApiHeader({ name: 'x-internal-api-key', description: '内部 API 密钥', required: true })
  async internalSuspendUser(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const user = await this.userService.suspendUser(id, body.reason);
    return {
      success: true,
      userId: user.id,
      status: user.status,
    };
  }

  @Post('internal/:id/unsuspend')
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '内部服务解封用户' })
  @ApiHeader({ name: 'x-internal-api-key', description: '内部 API 密钥', required: true })
  async internalUnsuspendUser(@Param('id') id: string) {
    const user = await this.userService.unsuspendUser(id);
    return {
      success: true,
      userId: user.id,
      status: user.status,
    };
  }
}
