import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { WebsocketService } from './websocket.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class PublishEventDto {
  channel: string;
  event: string;
  data: any;
}

@ApiTags('websocket')
@Controller('websocket')
export class WebsocketController {
  constructor(private readonly websocketService: WebsocketService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取 WebSocket 统计信息' })
  getStats() {
    return this.websocketService.getOnlineStats();
  }

  @Post('publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布实时事件（内部使用）' })
  async publishEvent(@Body() dto: PublishEventDto) {
    await this.websocketService.publishEvent(dto.channel, dto.event, dto.data);
    return { success: true, message: 'Event published' };
  }

  @Post('link-click')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布链接点击事件' })
  async publishLinkClick(
    @Body() dto: { teamId: string; linkId: string; clickData: any },
  ) {
    await this.websocketService.publishLinkClick(dto.teamId, dto.linkId, dto.clickData);
    return { success: true };
  }

  @Post('notification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发送用户通知' })
  async sendNotification(
    @Body() dto: { userId: string; notification: any },
  ) {
    await this.websocketService.publishUserNotification(dto.userId, dto.notification);
    return { success: true };
  }
}
