import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  CurrentUser,
} from '@lnk/nestjs-common';
import { InboxService } from './inbox.service';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard)
export class InboxController {
  constructor(private readonly service: InboxService) {}

  @Get()
  @ApiOperation({ summary: '获取用户通知列表' })
  getNotifications(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('read') read?: boolean,
    @Query('type') type?: string,
  ) {
    return this.service.getNotifications(userId, { page, limit, read, type });
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  getUnreadCount(@CurrentUser('sub') userId: string) {
    return this.service.getUnreadCount(userId);
  }

  @Get('preferences')
  @ApiOperation({ summary: '获取通知偏好设置' })
  getPreferences(@CurrentUser('sub') userId: string) {
    return this.service.getPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: '更新通知偏好设置' })
  updatePreferences(
    @CurrentUser('sub') userId: string,
    @Body() data: any,
  ) {
    return this.service.updatePreferences(userId, data);
  }

  @Post('read-all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.service.markAllAsRead(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个通知详情' })
  getNotification(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getNotification(id, userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markAsRead(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  deleteNotification(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteNotification(id, userId);
  }

  @Post('delete-batch')
  @ApiOperation({ summary: '批量删除通知' })
  deleteMultiple(
    @CurrentUser('sub') userId: string,
    @Body('ids') ids: string[],
  ) {
    return this.service.deleteMultiple(ids, userId);
  }

  @Post('clear-old')
  @ApiOperation({ summary: '清理旧的已读通知' })
  clearOldNotifications(
    @CurrentUser('sub') userId: string,
    @Body('daysOld') daysOld?: number,
  ) {
    return this.service.clearOldNotifications(userId, daysOld);
  }
}
