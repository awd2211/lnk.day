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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam, ApiHeader } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, UpdateWebhookDto, FireWebhookDto } from './dto/webhook.dto';
import { WebhookPlatform } from './entities/webhook.entity';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取所有 Webhooks' })
  @ApiQuery({ name: 'platform', required: false, enum: WebhookPlatform })
  async listWebhooks(
    @ScopedTeamId() teamId: string,
    @Query('platform') platform?: WebhookPlatform,
  ) {
    const webhooks = await this.webhookService.findAll(teamId, platform);
    return { webhooks };
  }

  @Post()
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '创建 Webhook' })
  async createWebhook(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWebhookDto,
  ) {
    const webhook = await this.webhookService.create(teamId, user.id, dto);
    return { webhook };
  }

  @Get('events')
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取可用的事件类型' })
  getEvents() {
    return {
      events: this.webhookService.getAvailableEvents(),
    };
  }

  @Get('platforms')
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取支持的平台' })
  getPlatforms() {
    return {
      platforms: [
        {
          id: WebhookPlatform.MAKE,
          name: 'Make (Integromat)',
          description: '可视化自动化平台',
          websiteUrl: 'https://www.make.com',
          docsUrl: 'https://www.make.com/en/help/tools/webhooks',
          setupGuide: this.webhookService.getMakeWebhookTemplate(),
        },
        {
          id: WebhookPlatform.N8N,
          name: 'n8n',
          description: '开源工作流自动化',
          websiteUrl: 'https://n8n.io',
          docsUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/',
          setupGuide: this.webhookService.getN8nWebhookTemplate(),
        },
        {
          id: WebhookPlatform.ZAPIER,
          name: 'Zapier',
          description: '连接您的应用程序',
          websiteUrl: 'https://zapier.com',
          docsUrl: 'https://zapier.com/help/create/code-webhooks/send-webhooks-in-zaps',
          setupGuide: '使用 Zapier 的 Webhooks by Zapier 应用创建触发器',
        },
        {
          id: WebhookPlatform.PIPEDREAM,
          name: 'Pipedream',
          description: '开发者友好的集成',
          websiteUrl: 'https://pipedream.com',
          docsUrl: 'https://pipedream.com/docs/workflows/steps/triggers/#http-webhooks',
          setupGuide: '在 Pipedream 中创建 HTTP/Webhook 触发器',
        },
        {
          id: WebhookPlatform.CUSTOM,
          name: '自定义 Webhook',
          description: '发送到您自己的端点',
          websiteUrl: null,
          docsUrl: null,
          setupGuide: '使用任意支持 HTTP POST 的端点',
        },
      ],
    };
  }

  @Get('stats')
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取 Webhook 统计' })
  async getStats(@ScopedTeamId() teamId: string) {
    const stats = await this.webhookService.getStats(teamId);
    return stats;
  }

  @Get(':id')
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  @ApiOperation({ summary: '获取单个 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async getWebhook(
    @ScopedTeamId() teamId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const webhook = await this.webhookService.findOne(id, teamId);
    return { webhook };
  }

  @Put(':id')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '更新 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async updateWebhook(
    @ScopedTeamId() teamId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = await this.webhookService.update(id, teamId, dto);
    return { webhook };
  }

  @Delete(':id')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '删除 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async deleteWebhook(
    @ScopedTeamId() teamId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.webhookService.delete(id, teamId);
    return { success: true };
  }

  @Post(':id/toggle')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '启用/禁用 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async toggleWebhook(
    @ScopedTeamId() teamId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const webhook = await this.webhookService.toggle(id, teamId);
    return { webhook };
  }

  @Post(':id/test')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: '测试 Webhook' })
  @ApiParam({ name: 'id', type: String })
  async testWebhook(
    @ScopedTeamId() teamId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.webhookService.testWebhook(id, teamId);
    return result;
  }

  // ========== Internal API (for other services to fire webhooks) ==========

  @Post('fire')
  @ApiOperation({ summary: '触发 Webhook (内部调用)' })
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  async fireWebhook(@Body() dto: FireWebhookDto) {
    const count = await this.webhookService.fireEvent(dto.event, dto.teamId, dto.data);
    return { fired: count };
  }

  // ========== Make.com 专用端点 ==========

  @Post('make/subscribe')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: 'Make.com 订阅 (用于 Custom App)' })
  async makeSubscribe(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { webhookUrl: string; event: string; name?: string },
  ) {
    const webhook = await this.webhookService.create(teamId, user.id, {
      name: body.name || `Make - ${body.event}`,
      platform: WebhookPlatform.MAKE,
      webhookUrl: body.webhookUrl,
      event: body.event as any,
    });

    return { id: webhook.id };
  }

  @Delete('make/unsubscribe/:id')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: 'Make.com 取消订阅' })
  @ApiParam({ name: 'id', type: String })
  async makeUnsubscribe(
    @ScopedTeamId() teamId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.webhookService.delete(id, teamId);
    return { success: true };
  }

  // ========== n8n 专用端点 ==========

  @Post('n8n/subscribe')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: 'n8n 订阅' })
  async n8nSubscribe(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { webhookUrl: string; event: string; name?: string },
  ) {
    const webhook = await this.webhookService.create(teamId, user.id, {
      name: body.name || `n8n - ${body.event}`,
      platform: WebhookPlatform.N8N,
      webhookUrl: body.webhookUrl,
      event: body.event as any,
    });

    return { id: webhook.id };
  }

  @Delete('n8n/unsubscribe/:id')
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  @ApiOperation({ summary: 'n8n 取消订阅' })
  @ApiParam({ name: 'id', type: String })
  async n8nUnsubscribe(
    @ScopedTeamId() teamId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.webhookService.delete(id, teamId);
    return { success: true };
  }
}
