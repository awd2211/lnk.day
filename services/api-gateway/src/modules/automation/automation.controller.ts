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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutomationService, CreateWebhookDto, UpdateWebhookDto } from './automation.service';
import { AutomationPlatform, WebhookEvent } from './entities/automation-webhook.entity';

@ApiTags('automation')
@Controller('automation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('webhooks')
  @ApiOperation({ summary: '获取所有 Webhooks' })
  @ApiQuery({ name: 'platform', required: false, enum: AutomationPlatform })
  async listWebhooks(
    @Req() req: any,
    @Query('platform') platform?: AutomationPlatform,
  ) {
    const webhooks = await this.automationService.findAll(req.user.teamId, platform);
    return { webhooks };
  }

  @Post('webhooks')
  @ApiOperation({ summary: '创建 Webhook' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'platform', 'webhookUrl', 'event'],
      properties: {
        name: { type: 'string', example: '新链接通知' },
        platform: { enum: Object.values(AutomationPlatform), example: 'make' },
        webhookUrl: { type: 'string', example: 'https://hook.make.com/xxx' },
        event: { type: 'string', example: 'link.created' },
        filters: { type: 'object' },
        headers: { type: 'object' },
      },
    },
  })
  async createWebhook(@Req() req: any, @Body() dto: CreateWebhookDto) {
    const webhook = await this.automationService.create(
      req.user.teamId,
      req.user.id,
      dto,
    );
    return { webhook };
  }

  @Get('webhooks/:id')
  @ApiOperation({ summary: '获取单个 Webhook' })
  async getWebhook(@Req() req: any, @Param('id') id: string) {
    const webhook = await this.automationService.findOne(id, req.user.teamId);
    return { webhook };
  }

  @Put('webhooks/:id')
  @ApiOperation({ summary: '更新 Webhook' })
  async updateWebhook(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = await this.automationService.update(id, req.user.teamId, dto);
    return { webhook };
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: '删除 Webhook' })
  async deleteWebhook(@Req() req: any, @Param('id') id: string) {
    await this.automationService.delete(id, req.user.teamId);
    return { success: true };
  }

  @Post('webhooks/:id/toggle')
  @ApiOperation({ summary: '启用/禁用 Webhook' })
  async toggleWebhook(@Req() req: any, @Param('id') id: string) {
    const webhook = await this.automationService.toggle(id, req.user.teamId);
    return { webhook };
  }

  @Post('webhooks/:id/test')
  @ApiOperation({ summary: '测试 Webhook' })
  async testWebhook(@Req() req: any, @Param('id') id: string) {
    const result = await this.automationService.testWebhook(id, req.user.teamId);
    return result;
  }

  @Get('events')
  @ApiOperation({ summary: '获取可用的事件类型' })
  getEvents() {
    return {
      events: this.automationService.getAvailableEvents(),
    };
  }

  @Get('platforms')
  @ApiOperation({ summary: '获取支持的平台' })
  getPlatforms() {
    return {
      platforms: [
        {
          id: AutomationPlatform.MAKE,
          name: 'Make (Integromat)',
          description: '可视化自动化平台',
          websiteUrl: 'https://www.make.com',
          docsUrl: 'https://www.make.com/en/help/tools/webhooks',
          setupGuide: this.automationService.getMakeWebhookTemplate(),
        },
        {
          id: AutomationPlatform.N8N,
          name: 'n8n',
          description: '开源工作流自动化',
          websiteUrl: 'https://n8n.io',
          docsUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/',
          setupGuide: this.automationService.getN8nWebhookTemplate(),
        },
        {
          id: AutomationPlatform.ZAPIER,
          name: 'Zapier',
          description: '连接您的应用程序',
          websiteUrl: 'https://zapier.com',
          docsUrl: 'https://zapier.com/help/create/code-webhooks/send-webhooks-in-zaps',
          setupGuide: '使用 Zapier 的 Webhooks by Zapier 应用创建触发器',
        },
        {
          id: AutomationPlatform.PIPEDREAM,
          name: 'Pipedream',
          description: '开发者友好的集成',
          websiteUrl: 'https://pipedream.com',
          docsUrl: 'https://pipedream.com/docs/workflows/steps/triggers/#http-webhooks',
          setupGuide: '在 Pipedream 中创建 HTTP/Webhook 触发器',
        },
        {
          id: AutomationPlatform.CUSTOM,
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
  @ApiOperation({ summary: '获取 Webhook 统计' })
  async getStats(@Req() req: any) {
    const stats = await this.automationService.getStats(req.user.teamId);
    return stats;
  }

  // ========== Make.com 专用端点 ==========

  @Post('make/subscribe')
  @ApiOperation({ summary: 'Make.com 订阅 (用于 Custom App)' })
  async makeSubscribe(
    @Req() req: any,
    @Body() body: { webhookUrl: string; event: WebhookEvent; name?: string },
  ) {
    const webhook = await this.automationService.create(req.user.teamId, req.user.id, {
      name: body.name || `Make - ${body.event}`,
      platform: AutomationPlatform.MAKE,
      webhookUrl: body.webhookUrl,
      event: body.event,
    });

    return { id: webhook.id };
  }

  @Delete('make/unsubscribe/:id')
  @ApiOperation({ summary: 'Make.com 取消订阅' })
  async makeUnsubscribe(@Req() req: any, @Param('id') id: string) {
    await this.automationService.delete(id, req.user.teamId);
    return { success: true };
  }

  // ========== n8n 专用端点 ==========

  @Post('n8n/subscribe')
  @ApiOperation({ summary: 'n8n 订阅' })
  async n8nSubscribe(
    @Req() req: any,
    @Body() body: { webhookUrl: string; event: WebhookEvent; name?: string },
  ) {
    const webhook = await this.automationService.create(req.user.teamId, req.user.id, {
      name: body.name || `n8n - ${body.event}`,
      platform: AutomationPlatform.N8N,
      webhookUrl: body.webhookUrl,
      event: body.event,
    });

    return { id: webhook.id };
  }

  @Delete('n8n/unsubscribe/:id')
  @ApiOperation({ summary: 'n8n 取消订阅' })
  async n8nUnsubscribe(@Req() req: any, @Param('id') id: string) {
    await this.automationService.delete(id, req.user.teamId);
    return { success: true };
  }
}
