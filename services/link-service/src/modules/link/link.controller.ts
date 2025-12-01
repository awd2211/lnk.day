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
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import {
  Permission,
  RequirePermissions,
  PermissionGuard,
  JwtAuthGuard,
  AuthenticatedUser,
  CurrentUser,
  ScopeGuard,
  ScopedTeamId,
  isPlatformAdmin,
} from '@lnk/nestjs-common';

import { LinkService } from './link.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { BulkOperationDto, BulkCreateDto } from './dto/bulk-operation.dto';
import { CloneLinkDto } from './dto/clone-link.dto';
import { ScheduleLinkDto, UpdateScheduleDto } from './dto/schedule-link.dto';
import { SetPasswordDto, VerifyPasswordDto } from './dto/password.dto';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@ApiTags('links')
@Controller('links')
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@ApiBearerAuth()
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post()
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '创建短链接' })
  create(
    @Body() createLinkDto: CreateLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.linkService.create(createLinkDto, user.id, teamId);
  }

  @Get()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取链接列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段 (createdAt, clicks, title, shortCode, updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序方向 (ASC, DESC)' })
  @ApiQuery({ name: 'status', required: false, description: '状态筛选 (active, inactive, archived)' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'folderId', required: false, description: '文件夹ID' })
  findAll(
    @ScopedTeamId() teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('folderId') folderId?: string,
  ) {
    return this.linkService.findAll(teamId, { page, limit, sortBy, sortOrder, status, search, folderId });
  }

  @Get(':id')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取单个链接' })
  async findOne(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const link = await this.linkService.findOne(id);
    // 验证资源归属（平台管理员可访问任意资源）
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权访问此链接');
    }
    return link;
  }

  @Get('code/:shortCode')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '通过短码获取链接' })
  async findByShortCode(
    @Param('shortCode') shortCode: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const link = await this.linkService.findByShortCode(shortCode);
    if (!link) {
      throw new NotFoundException('链接不存在');
    }
    // 验证资源归属
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权访问此链接');
    }
    return link;
  }

  @Put(':id')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '更新链接' })
  async update(
    @Param('id') id: string,
    @Body() updateLinkDto: UpdateLinkDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // 先验证资源归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权修改此链接');
    }
    return this.linkService.update(id, updateLinkDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.LINKS_DELETE)
  @ApiOperation({ summary: '删除链接' })
  async remove(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // 先验证资源归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权删除此链接');
    }
    return this.linkService.remove(id);
  }

  // ========== 批量操作 ==========

  @Post('bulk')
  @RequirePermissions(Permission.LINKS_BULK_EDIT)
  @ApiOperation({ summary: '批量操作链接' })
  bulkOperation(
    @Body() bulkOperationDto: BulkOperationDto,
    @ScopedTeamId() teamId: string,
  ) {
    return this.linkService.bulkOperation(bulkOperationDto, teamId);
  }

  @Post('bulk/create')
  @RequirePermissions(Permission.LINKS_CREATE, Permission.LINKS_BULK_EDIT)
  @ApiOperation({ summary: '批量创建链接' })
  bulkCreate(
    @Body() bulkCreateDto: BulkCreateDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.linkService.bulkCreate(bulkCreateDto, user.id, teamId);
  }

  // ========== 统计接口 ==========

  @Get('stats')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取链接统计概览' })
  getStats(@ScopedTeamId() teamId: string) {
    return this.linkService.getStats(teamId);
  }

  @Get(':id/stats')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取单个链接统计' })
  async getLinkStats(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // 验证资源归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权访问此链接统计');
    }
    return this.linkService.getLinkStats(id);
  }

  // ========== 链接克隆 ==========

  @Post(':id/clone')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '克隆链接' })
  async cloneLink(
    @Param('id') id: string,
    @Body() cloneLinkDto: CloneLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    // 验证源链接归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权克隆此链接');
    }
    return this.linkService.cloneLink(id, cloneLinkDto, user.id, teamId);
  }

  // ========== 定时发布 ==========

  @Post(':id/schedule')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '创建定时任务' })
  async scheduleLink(
    @Param('id') id: string,
    @Body() scheduleLinkDto: ScheduleLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    // 验证链接归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权为此链接创建定时任务');
    }
    return this.linkService.scheduleLink(id, scheduleLinkDto, user.id);
  }

  @Get(':id/schedules')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取链接的所有定时任务' })
  async getSchedules(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // 验证链接归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权查看此链接的定时任务');
    }
    return this.linkService.getSchedules(id);
  }

  @Get(':id/schedules/pending')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取链接的待执行定时任务' })
  async getPendingSchedules(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // 验证链接归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权查看此链接的定时任务');
    }
    return this.linkService.getPendingSchedules(id);
  }

  @Put('schedules/:scheduleId')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '更新定时任务' })
  updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @ScopedTeamId() teamId: string,
  ) {
    return this.linkService.updateSchedule(scheduleId, updateScheduleDto, teamId);
  }

  @Delete('schedules/:scheduleId')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '取消定时任务' })
  cancelSchedule(
    @Param('scheduleId') scheduleId: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.linkService.cancelSchedule(scheduleId, teamId);
  }

  // ========== 密码保护 ==========

  @Post(':id/password')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '设置链接密码' })
  async setPassword(
    @Param('id') id: string,
    @Body() dto: SetPasswordDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // 验证链接归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权设置此链接的密码');
    }
    return this.linkService.setLinkPassword(id, dto.password);
  }

  @Delete(':id/password')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '移除链接密码' })
  async removePassword(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // 验证链接归属
    const link = await this.linkService.findOne(id);
    if (!isPlatformAdmin(user) && link.teamId !== teamId) {
      throw new ForbiddenException('无权移除此链接的密码');
    }
    return this.linkService.removeLinkPassword(id);
  }

  // ========== 公开接口（无需认证） ==========

  @Post(':id/password/verify')
  @UseGuards() // 覆盖类级别的守卫，允许公开访问
  @ApiOperation({ summary: '验证链接密码（公开接口）' })
  async verifyPassword(
    @Param('id') id: string,
    @Body() dto: VerifyPasswordDto,
  ) {
    const valid = await this.linkService.verifyLinkPassword(id, dto.password);
    return { valid };
  }
}

// ========== 内部服务 API Controller（独立） ==========

@ApiTags('links-internal')
@Controller('links/internal')
export class LinkInternalController {
  constructor(private readonly linkService: LinkService) {}

  @Get('code/:shortCode')
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: '内部 API - 通过短码获取链接' })
  @ApiHeader({ name: 'x-internal-api-key', description: '内部 API 密钥', required: true })
  internalFindByShortCode(@Param('shortCode') shortCode: string) {
    return this.linkService.findByShortCode(shortCode);
  }

  @Post('clicks/:id')
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: '内部 API - 增加点击计数' })
  @ApiHeader({ name: 'x-internal-api-key', description: '内部 API 密钥', required: true })
  async internalIncrementClicks(@Param('id') id: string) {
    await this.linkService.incrementClicks(id);
    return { success: true };
  }
}

// ========== 控制台统计内部 API（无需认证） ==========

@ApiTags('internal')
@Controller('internal')
export class LinkStatsInternalController {
  constructor(private readonly linkService: LinkService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取平台链接统计 (内部API)' })
  async getGlobalStats() {
    return this.linkService.getGlobalStats();
  }
}
