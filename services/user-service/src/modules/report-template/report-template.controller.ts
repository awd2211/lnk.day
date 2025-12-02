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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  RequirePermissions,
  Permission,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import { ReportTemplateService } from './report-template.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { ReportCategory } from './entities/report-template.entity';

@ApiTags('Report Templates')
@ApiBearerAuth()
@Controller('report-templates')
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class ReportTemplateController {
  constructor(private readonly reportTemplateService: ReportTemplateService) {}

  @Post()
  @ApiOperation({ summary: '创建报告模板' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async create(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportTemplateDto,
  ) {
    return this.reportTemplateService.create(teamId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取报告模板列表' })
  @ApiQuery({ name: 'category', required: false, enum: ['traffic', 'conversion', 'engagement', 'comparison', 'custom'] })
  @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('category') category?: ReportCategory,
    @Query('isFavorite') isFavorite?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportTemplateService.findAll(teamId, {
      category,
      isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取报告模板统计' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async getStats(@ScopedTeamId() teamId: string) {
    return this.reportTemplateService.getStats(teamId);
  }

  @Get('scheduled')
  @ApiOperation({ summary: '获取已启用定时发送的模板' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async getScheduledReports(@ScopedTeamId() teamId: string) {
    return this.reportTemplateService.getScheduledReports(teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个报告模板' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.reportTemplateService.findOne(id, teamId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新报告模板' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateReportTemplateDto,
  ) {
    return this.reportTemplateService.update(id, teamId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除报告模板' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.reportTemplateService.remove(id, teamId);
    return { success: true };
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: '切换收藏状态' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.reportTemplateService.toggleFavorite(id, teamId);
  }

  @Post(':id/use')
  @ApiOperation({ summary: '增加使用次数' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async incrementUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.reportTemplateService.incrementUsage(id, teamId);
  }

  @Post(':id/generate')
  @ApiOperation({ summary: '标记报告已生成' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async markGenerated(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.reportTemplateService.markGenerated(id, teamId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: '复制模板' })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportTemplateService.duplicate(id, teamId, user.sub);
  }
}
