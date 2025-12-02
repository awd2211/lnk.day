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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  CurrentUser,
  ScopedTeamId,
  RequirePermissions,
  Permission,
} from '@lnk/nestjs-common';
import { WebhookTemplateService } from './template.service';
import { CreateWebhookTemplateDto } from './dto/create-webhook-template.dto';
import { UpdateWebhookTemplateDto } from './dto/update-webhook-template.dto';

@ApiTags('Webhook Templates')
@ApiBearerAuth()
@Controller('webhook-templates')
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class WebhookTemplateController {
  constructor(private readonly templateService: WebhookTemplateService) {}

  @Post()
  @ApiOperation({ summary: '创建 Webhook 模板' })
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  async create(
    @ScopedTeamId() teamId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWebhookTemplateDto,
  ) {
    return this.templateService.create(teamId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取 Webhook 模板列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
  @ApiQuery({ name: 'platform', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isFavorite') isFavorite?: boolean,
    @Query('platform') platform?: string,
    @Query('search') search?: string,
  ) {
    return this.templateService.findAll(teamId, { page, limit, isFavorite, platform, search });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取 Webhook 模板详情' })
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.templateService.findOne(id, teamId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 Webhook 模板' })
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateWebhookTemplateDto,
  ) {
    return this.templateService.update(id, teamId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Webhook 模板' })
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.templateService.remove(id, teamId);
    return { success: true };
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: '切换模板收藏状态' })
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.templateService.toggleFavorite(id, teamId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: '复制模板' })
  @RequirePermissions(Permission.WEBHOOKS_MANAGE)
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser('id') userId: string,
    @Body('name') newName?: string,
  ) {
    return this.templateService.duplicate(id, teamId, userId, newName);
  }

  @Post(':id/use')
  @ApiOperation({ summary: '使用模板（增加使用计数）' })
  @RequirePermissions(Permission.WEBHOOKS_VIEW)
  async use(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.templateService.incrementUsage(id, teamId);
    return { success: true };
  }
}
