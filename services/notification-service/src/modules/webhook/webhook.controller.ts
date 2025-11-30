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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { WebhookEndpointService } from './webhook-endpoint.service';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
  isPlatformAdmin,
} from '@lnk/nestjs-common';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TestWebhookDto,
} from './dto/create-webhook.dto';
import { WebhookEndpoint, WebhookEventType } from './entities/webhook-endpoint.entity';

@ApiTags('webhooks')
@Controller('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class WebhookController {
  constructor(private readonly webhookEndpointService: WebhookEndpointService) {}

  @Post()
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '创建 Webhook 端点' })
  @ApiResponse({ status: 201, type: WebhookEndpoint })
  async create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<WebhookEndpoint> {
    return this.webhookEndpointService.create(dto, user.id, teamId);
  }

  @Get()
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取 Webhook 列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.webhookEndpointService.findAll(teamId, { page, limit });
  }

  @Get('events')
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取支持的事件类型列表' })
  getEventTypes() {
    return {
      events: Object.values(WebhookEventType).map((event) => ({
        type: event,
        description: this.getEventDescription(event),
      })),
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取 Webhook 详情' })
  @ApiParam({ name: 'id', type: String })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WebhookEndpoint> {
    const webhook = await this.webhookEndpointService.findOne(id);
    if (!isPlatformAdmin(user) && webhook.teamId !== teamId) {
      throw new ForbiddenException('无权访问此 Webhook');
    }
    return webhook;
  }

  @Get(':id/deliveries')
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取 Webhook 投递记录' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getDeliveries(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const webhook = await this.webhookEndpointService.findOne(id);
    if (!isPlatformAdmin(user) && webhook.teamId !== teamId) {
      throw new ForbiddenException('无权访问此 Webhook');
    }
    return this.webhookEndpointService.getDeliveries(id, { page, limit });
  }

  @Put(':id')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '更新 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WebhookEndpoint> {
    const webhook = await this.webhookEndpointService.findOne(id);
    if (!isPlatformAdmin(user) && webhook.teamId !== teamId) {
      throw new ForbiddenException('无权修改此 Webhook');
    }
    return this.webhookEndpointService.update(id, dto);
  }

  @Post(':id/enable')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '启用 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WebhookEndpoint> {
    const webhook = await this.webhookEndpointService.findOne(id);
    if (!isPlatformAdmin(user) && webhook.teamId !== teamId) {
      throw new ForbiddenException('无权操作此 Webhook');
    }
    return this.webhookEndpointService.enable(id);
  }

  @Post(':id/disable')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '禁用 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WebhookEndpoint> {
    const webhook = await this.webhookEndpointService.findOne(id);
    if (!isPlatformAdmin(user) && webhook.teamId !== teamId) {
      throw new ForbiddenException('无权操作此 Webhook');
    }
    return this.webhookEndpointService.disable(id);
  }

  @Post(':id/regenerate-secret')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '重新生成 Webhook 密钥' })
  @ApiParam({ name: 'id', type: String })
  async regenerateSecret(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webhook = await this.webhookEndpointService.findOne(id);
    if (!isPlatformAdmin(user) && webhook.teamId !== teamId) {
      throw new ForbiddenException('无权操作此 Webhook');
    }
    return this.webhookEndpointService.regenerateSecret(id);
  }

  @Post(':id/test')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '发送测试 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async test(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestWebhookDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webhook = await this.webhookEndpointService.findOne(id);
    if (!isPlatformAdmin(user) && webhook.teamId !== teamId) {
      throw new ForbiddenException('无权操作此 Webhook');
    }
    return this.webhookEndpointService.testWebhook(id, dto.event);
  }

  @Post('deliveries/:deliveryId/retry')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '重试失败的投递' })
  @ApiParam({ name: 'deliveryId', type: String })
  async retryDelivery(@Param('deliveryId', ParseUUIDPipe) deliveryId: string) {
    return this.webhookEndpointService.retryDelivery(deliveryId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '删除 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const webhook = await this.webhookEndpointService.findOne(id);
    if (!isPlatformAdmin(user) && webhook.teamId !== teamId) {
      throw new ForbiddenException('无权删除此 Webhook');
    }
    await this.webhookEndpointService.remove(id);
    return { message: 'Webhook deleted successfully' };
  }

  private getEventDescription(event: WebhookEventType): string {
    const descriptions: Record<WebhookEventType, string> = {
      // Link events
      [WebhookEventType.LINK_CREATED]: '链接创建时触发',
      [WebhookEventType.LINK_UPDATED]: '链接更新时触发',
      [WebhookEventType.LINK_DELETED]: '链接删除时触发',
      [WebhookEventType.LINK_CLICKED]: '链接被点击时触发',
      [WebhookEventType.LINK_MILESTONE]: '链接达到点击里程碑时触发（如100/1000/10000次点击）',
      [WebhookEventType.LINK_EXPIRED]: '链接过期时触发',

      // QR events
      [WebhookEventType.QR_CREATED]: '二维码创建时触发',
      [WebhookEventType.QR_SCANNED]: '二维码被扫描时触发',
      [WebhookEventType.QR_UPDATED]: '二维码更新时触发',
      [WebhookEventType.QR_DELETED]: '二维码删除时触发',

      // Page events
      [WebhookEventType.PAGE_CREATED]: '落地页创建时触发',
      [WebhookEventType.PAGE_PUBLISHED]: '落地页发布时触发',
      [WebhookEventType.PAGE_UNPUBLISHED]: '落地页取消发布时触发',
      [WebhookEventType.PAGE_DELETED]: '落地页删除时触发',

      // Campaign events
      [WebhookEventType.CAMPAIGN_CREATED]: '营销活动创建时触发',
      [WebhookEventType.CAMPAIGN_STARTED]: '营销活动开始时触发',
      [WebhookEventType.CAMPAIGN_ENDED]: '营销活动结束时触发',
      [WebhookEventType.CAMPAIGN_GOAL_REACHED]: '营销活动达到目标时触发',

      // Team events
      [WebhookEventType.TEAM_MEMBER_ADDED]: '团队成员添加时触发',
      [WebhookEventType.TEAM_MEMBER_REMOVED]: '团队成员移除时触发',
      [WebhookEventType.TEAM_ROLE_CHANGED]: '团队成员角色变更时触发',

      // Analytics events
      [WebhookEventType.ANALYTICS_THRESHOLD]: '达到自定义阈值时触发（如点击数超过1000）',
      [WebhookEventType.ANALYTICS_ANOMALY]: '检测到数据异常时触发（如流量突然激增）',
    };
    return descriptions[event] || event;
  }
}
