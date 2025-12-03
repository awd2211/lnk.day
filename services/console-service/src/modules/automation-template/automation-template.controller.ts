import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import { AutomationTemplateService } from './automation-template.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { CreateAutomationTemplateDto } from './dto/create-automation-template.dto';
import { UpdateAutomationTemplateDto } from './dto/update-automation-template.dto';
import { TemplateCategory } from './entities/automation-template.entity';

@ApiTags('Automation Templates')
@ApiBearerAuth()
@Controller('automation-templates')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(AuditLogInterceptor)
export class AutomationTemplateController {
  constructor(private readonly automationTemplateService: AutomationTemplateService) {}

  @Post()
  @ApiOperation({ summary: '创建自动化模板' })
  @LogAudit({
    action: 'automation.template.create',
    targetType: 'automation_template',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'category', 'trigger'],
  })
  async create(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAutomationTemplateDto,
  ) {
    return this.automationTemplateService.create(teamId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取自动化模板列表' })
  @ApiQuery({ name: 'category', required: false, enum: ['notification', 'moderation', 'analytics', 'integration', 'custom'] })
  @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('category') category?: TemplateCategory,
    @Query('isFavorite') isFavorite?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string | string[],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedTags = tags
      ? Array.isArray(tags) ? tags : [tags]
      : undefined;

    return this.automationTemplateService.findAll(teamId, {
      category,
      isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
      search,
      tags: parsedTags,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取自动化模板统计' })
  async getStats(@ScopedTeamId() teamId: string) {
    return this.automationTemplateService.getStats(teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个自动化模板' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.automationTemplateService.findOne(id, teamId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新自动化模板' })
  @LogAudit({
    action: 'automation.template.update',
    targetType: 'automation_template',
    targetIdParam: 'id',
    detailFields: ['name', 'category', 'trigger'],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateAutomationTemplateDto,
  ) {
    return this.automationTemplateService.update(id, teamId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除自动化模板' })
  @LogAudit({
    action: 'automation.template.delete',
    targetType: 'automation_template',
    targetIdParam: 'id',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.automationTemplateService.remove(id, teamId);
    return { success: true };
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: '切换收藏状态' })
  @LogAudit({
    action: 'automation.template.favorite.toggle',
    targetType: 'automation_template',
    targetIdParam: 'id',
  })
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.automationTemplateService.toggleFavorite(id, teamId);
  }

  @Post(':id/use')
  @ApiOperation({ summary: '增加使用次数' })
  @LogAudit({
    action: 'automation.template.use',
    targetType: 'automation_template',
    targetIdParam: 'id',
  })
  async incrementUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.automationTemplateService.incrementUsage(id, teamId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: '复制模板' })
  @LogAudit({
    action: 'automation.template.duplicate',
    targetType: 'automation_template',
    targetIdParam: 'id',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
  })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.automationTemplateService.duplicate(id, teamId, user.sub);
  }
}
