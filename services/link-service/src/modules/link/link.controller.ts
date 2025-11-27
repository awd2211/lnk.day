import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';

import { LinkService } from './link.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { BulkOperationDto, BulkCreateDto } from './dto/bulk-operation.dto';
import { CloneLinkDto } from './dto/clone-link.dto';
import { ScheduleLinkDto, UpdateScheduleDto } from './dto/schedule-link.dto';
import { SetPasswordDto, VerifyPasswordDto } from './dto/password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('links')
@Controller('links')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建短链接' })
  create(
    @Body() createLinkDto: CreateLinkDto,
    @CurrentUser() user: { id: string; email: string },
    @Headers('x-team-id') teamId: string,
  ) {
    return this.linkService.create(createLinkDto, user.id, teamId || user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取链接列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser() user: { id: string },
    @Headers('x-team-id') teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.linkService.findAll(teamId || user.id, { page, limit });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个链接' })
  findOne(@Param('id') id: string) {
    return this.linkService.findOne(id);
  }

  @Get('code/:shortCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '通过短码获取链接' })
  findByShortCode(@Param('shortCode') shortCode: string) {
    return this.linkService.findByShortCode(shortCode);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新链接' })
  update(@Param('id') id: string, @Body() updateLinkDto: UpdateLinkDto) {
    return this.linkService.update(id, updateLinkDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除链接' })
  remove(@Param('id') id: string) {
    return this.linkService.remove(id);
  }

  // ========== 批量操作 ==========

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量操作链接' })
  bulkOperation(
    @Body() bulkOperationDto: BulkOperationDto,
    @CurrentUser() user: { id: string },
    @Headers('x-team-id') teamId: string,
  ) {
    return this.linkService.bulkOperation(bulkOperationDto, teamId || user.id);
  }

  @Post('bulk/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量创建链接' })
  bulkCreate(
    @Body() bulkCreateDto: BulkCreateDto,
    @CurrentUser() user: { id: string; email: string },
    @Headers('x-team-id') teamId: string,
  ) {
    return this.linkService.bulkCreate(bulkCreateDto, user.id, teamId || user.id);
  }

  // ========== 统计接口 ==========

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取链接统计概览' })
  getStats(
    @CurrentUser() user: { id: string },
    @Headers('x-team-id') teamId: string,
  ) {
    return this.linkService.getStats(teamId || user.id);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个链接统计' })
  getLinkStats(@Param('id') id: string) {
    return this.linkService.getLinkStats(id);
  }

  // ========== 内部服务 API (供 redirect-service 调用) ==========

  @Get('internal/code/:shortCode')
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: '内部 API - 通过短码获取链接' })
  @ApiHeader({ name: 'x-internal-key', description: '内部 API 密钥', required: true })
  internalFindByShortCode(@Param('shortCode') shortCode: string) {
    return this.linkService.findByShortCode(shortCode);
  }

  @Post('internal/clicks/:id')
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: '内部 API - 增加点击计数' })
  @ApiHeader({ name: 'x-internal-key', description: '内部 API 密钥', required: true })
  async internalIncrementClicks(@Param('id') id: string) {
    await this.linkService.incrementClicks(id);
    return { success: true };
  }

  // ========== 链接克隆 ==========

  @Post(':id/clone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '克隆链接' })
  cloneLink(
    @Param('id') id: string,
    @Body() cloneLinkDto: CloneLinkDto,
    @CurrentUser() user: { id: string },
    @Headers('x-team-id') teamId: string,
  ) {
    return this.linkService.cloneLink(id, cloneLinkDto, user.id, teamId || user.id);
  }

  // ========== 定时发布 ==========

  @Post(':id/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建定时任务' })
  scheduleLink(
    @Param('id') id: string,
    @Body() scheduleLinkDto: ScheduleLinkDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.linkService.scheduleLink(id, scheduleLinkDto, user.id);
  }

  @Get(':id/schedules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取链接的所有定时任务' })
  getSchedules(@Param('id') id: string) {
    return this.linkService.getSchedules(id);
  }

  @Get(':id/schedules/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取链接的待执行定时任务' })
  getPendingSchedules(@Param('id') id: string) {
    return this.linkService.getPendingSchedules(id);
  }

  @Put('schedules/:scheduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新定时任务' })
  updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.linkService.updateSchedule(scheduleId, updateScheduleDto);
  }

  @Delete('schedules/:scheduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消定时任务' })
  cancelSchedule(@Param('scheduleId') scheduleId: string) {
    return this.linkService.cancelSchedule(scheduleId);
  }

  // ========== 密码保护 ==========

  @Post(':id/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置链接密码' })
  setPassword(
    @Param('id') id: string,
    @Body() dto: SetPasswordDto,
  ) {
    return this.linkService.setLinkPassword(id, dto.password);
  }

  @Delete(':id/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '移除链接密码' })
  removePassword(@Param('id') id: string) {
    return this.linkService.removeLinkPassword(id);
  }

  @Post(':id/password/verify')
  @ApiOperation({ summary: '验证链接密码（公开接口）' })
  async verifyPassword(
    @Param('id') id: string,
    @Body() dto: VerifyPasswordDto,
  ) {
    const valid = await this.linkService.verifyLinkPassword(id, dto.password);
    return { valid };
  }
}
