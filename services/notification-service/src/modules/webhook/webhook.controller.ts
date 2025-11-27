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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { WebhookEndpointService } from './webhook-endpoint.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TestWebhookDto,
} from './dto/create-webhook.dto';
import { WebhookEndpoint, WebhookEventType } from './entities/webhook-endpoint.entity';

@ApiTags('webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookEndpointService: WebhookEndpointService) {}

  @Post()
  @ApiOperation({ summary: '创建 Webhook 端点' })
  @ApiResponse({ status: 201, type: WebhookEndpoint })
  async create(
    @Body() dto: CreateWebhookDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<WebhookEndpoint> {
    return this.webhookEndpointService.create(dto, userId, teamId || userId);
  }

  @Get()
  @ApiOperation({ summary: '获取 Webhook 列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.webhookEndpointService.findAll(teamId || userId, { page, limit });
  }

  @Get('events')
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
  @ApiOperation({ summary: '获取 Webhook 详情' })
  async findOne(@Param('id') id: string): Promise<WebhookEndpoint> {
    return this.webhookEndpointService.findOne(id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: '获取 Webhook 投递记录' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getDeliveries(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.webhookEndpointService.getDeliveries(id, { page, limit });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 Webhook' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ): Promise<WebhookEndpoint> {
    return this.webhookEndpointService.update(id, dto);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: '启用 Webhook' })
  async enable(@Param('id') id: string): Promise<WebhookEndpoint> {
    return this.webhookEndpointService.enable(id);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: '禁用 Webhook' })
  async disable(@Param('id') id: string): Promise<WebhookEndpoint> {
    return this.webhookEndpointService.disable(id);
  }

  @Post(':id/regenerate-secret')
  @ApiOperation({ summary: '重新生成 Webhook 密钥' })
  async regenerateSecret(@Param('id') id: string) {
    return this.webhookEndpointService.regenerateSecret(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: '发送测试 Webhook' })
  async test(@Param('id') id: string, @Body() dto: TestWebhookDto) {
    return this.webhookEndpointService.testWebhook(id, dto.event);
  }

  @Post('deliveries/:deliveryId/retry')
  @ApiOperation({ summary: '重试失败的投递' })
  async retryDelivery(@Param('deliveryId') deliveryId: string) {
    return this.webhookEndpointService.retryDelivery(deliveryId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Webhook' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.webhookEndpointService.remove(id);
    return { message: 'Webhook deleted successfully' };
  }

  private getEventDescription(event: WebhookEventType): string {
    const descriptions: Record<WebhookEventType, string> = {
      [WebhookEventType.LINK_CREATED]: '链接创建时触发',
      [WebhookEventType.LINK_UPDATED]: '链接更新时触发',
      [WebhookEventType.LINK_DELETED]: '链接删除时触发',
      [WebhookEventType.LINK_CLICKED]: '链接被点击时触发',
      [WebhookEventType.LINK_MILESTONE]: '链接达到点击里程碑时触发',
      [WebhookEventType.PAGE_PUBLISHED]: '落地页发布时触发',
      [WebhookEventType.PAGE_UNPUBLISHED]: '落地页取消发布时触发',
      [WebhookEventType.CAMPAIGN_STARTED]: '营销活动开始时触发',
      [WebhookEventType.CAMPAIGN_ENDED]: '营销活动结束时触发',
      [WebhookEventType.TEAM_MEMBER_ADDED]: '团队成员添加时触发',
      [WebhookEventType.TEAM_MEMBER_REMOVED]: '团队成员移除时触发',
    };
    return descriptions[event] || event;
  }
}
