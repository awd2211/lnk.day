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
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, UpdateWebhookDto, FireWebhookDto } from './dto/webhook.dto';
import { WebhookPlatform } from './entities/webhook.entity';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @ApiOperation({ summary: '获取所有 Webhooks' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiQuery({ name: 'platform', required: false, enum: WebhookPlatform })
  async listWebhooks(
    @Headers('x-team-id') teamId: string,
    @Query('platform') platform?: WebhookPlatform,
  ) {
    const webhooks = await this.webhookService.findAll(teamId, platform);
    return { webhooks };
  }

  @Post()
  @ApiOperation({ summary: '创建 Webhook' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiHeader({ name: 'x-user-id', required: true })
  async createWebhook(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    const webhook = await this.webhookService.create(teamId, userId, dto);
    return { webhook };
  }

  @Get('events')
  @ApiOperation({ summary: '获取可用的事件类型' })
  getEvents() {
    return {
      events: this.webhookService.getAvailableEvents(),
    };
  }

  @Get('platforms')
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
  @ApiOperation({ summary: '获取 Webhook 统计' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  async getStats(@Headers('x-team-id') teamId: string) {
    const stats = await this.webhookService.getStats(teamId);
    return stats;
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 Webhook' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  async getWebhook(@Headers('x-team-id') teamId: string, @Param('id') id: string) {
    const webhook = await this.webhookService.findOne(id, teamId);
    return { webhook };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 Webhook' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  async updateWebhook(
    @Headers('x-team-id') teamId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = await this.webhookService.update(id, teamId, dto);
    return { webhook };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Webhook' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  async deleteWebhook(@Headers('x-team-id') teamId: string, @Param('id') id: string) {
    await this.webhookService.delete(id, teamId);
    return { success: true };
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: '启用/禁用 Webhook' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  async toggleWebhook(@Headers('x-team-id') teamId: string, @Param('id') id: string) {
    const webhook = await this.webhookService.toggle(id, teamId);
    return { webhook };
  }

  @Post(':id/test')
  @ApiOperation({ summary: '测试 Webhook' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  async testWebhook(@Headers('x-team-id') teamId: string, @Param('id') id: string) {
    const result = await this.webhookService.testWebhook(id, teamId);
    return result;
  }

  // ========== Internal API (for other services to fire webhooks) ==========

  @Post('fire')
  @ApiOperation({ summary: '触发 Webhook (内部调用)' })
  @ApiHeader({ name: 'x-internal-key', required: true })
  async fireWebhook(@Body() dto: FireWebhookDto) {
    const count = await this.webhookService.fireEvent(dto.event, dto.teamId, dto.data);
    return { fired: count };
  }

  // ========== Make.com 专用端点 ==========

  @Post('make/subscribe')
  @ApiOperation({ summary: 'Make.com 订阅 (用于 Custom App)' })
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiHeader({ name: 'x-user-id', required: true })
  async makeSubscribe(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { webhookUrl: string; event: string; name?: string },
  ) {
    const webhook = await this.webhookService.create(teamId, userId, {
      name: body.name || `Make - ${body.event}`,
      platform: WebhookPlatform.MAKE,
      webhookUrl: body.webhookUrl,
      event: body.event as any,
    });

    return { id: webhook.id };
  }

  @Delete('make/unsubscribe/:id')
  @ApiOperation({ summary: 'Make.com 取消订阅' })
  @ApiHeader({ name: 'x-team-id', required: true })
  async makeUnsubscribe(@Headers('x-team-id') teamId: string, @Param('id') id: string) {
    await this.webhookService.delete(id, teamId);
    return { success: true };
  }

  // ========== n8n 专用端点 ==========

  @Post('n8n/subscribe')
  @ApiOperation({ summary: 'n8n 订阅' })
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiHeader({ name: 'x-user-id', required: true })
  async n8nSubscribe(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { webhookUrl: string; event: string; name?: string },
  ) {
    const webhook = await this.webhookService.create(teamId, userId, {
      name: body.name || `n8n - ${body.event}`,
      platform: WebhookPlatform.N8N,
      webhookUrl: body.webhookUrl,
      event: body.event as any,
    });

    return { id: webhook.id };
  }

  @Delete('n8n/unsubscribe/:id')
  @ApiOperation({ summary: 'n8n 取消订阅' })
  @ApiHeader({ name: 'x-team-id', required: true })
  async n8nUnsubscribe(@Headers('x-team-id') teamId: string, @Param('id') id: string) {
    await this.webhookService.delete(id, teamId);
    return { success: true };
  }
}
