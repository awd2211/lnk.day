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
import { SeoTemplateService } from './seo-template.service';
import { CreateSeoTemplateDto } from './dto/create-seo-template.dto';
import { UpdateSeoTemplateDto } from './dto/update-seo-template.dto';

@ApiTags('SEO Templates')
@ApiBearerAuth()
@Controller('seo-templates')
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class SeoTemplateController {
  constructor(private readonly seoTemplateService: SeoTemplateService) {}

  @Post()
  @ApiOperation({ summary: '创建 SEO 模板' })
  @RequirePermissions(Permission.PAGES_CREATE)
  async create(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSeoTemplateDto,
  ) {
    return this.seoTemplateService.create(teamId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取 SEO 模板列表' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @RequirePermissions(Permission.PAGES_VIEW)
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('category') category?: string,
    @Query('isFavorite') isFavorite?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.seoTemplateService.findAll(teamId, {
      category,
      isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取 SEO 模板统计' })
  @RequirePermissions(Permission.PAGES_VIEW)
  async getStats(@ScopedTeamId() teamId: string) {
    return this.seoTemplateService.getStats(teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 SEO 模板' })
  @RequirePermissions(Permission.PAGES_VIEW)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.seoTemplateService.findOne(id, teamId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 SEO 模板' })
  @RequirePermissions(Permission.PAGES_EDIT)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateSeoTemplateDto,
  ) {
    return this.seoTemplateService.update(id, teamId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 SEO 模板' })
  @RequirePermissions(Permission.PAGES_DELETE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.seoTemplateService.remove(id, teamId);
    return { success: true };
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: '切换收藏状态' })
  @RequirePermissions(Permission.PAGES_EDIT)
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.seoTemplateService.toggleFavorite(id, teamId);
  }

  @Post(':id/use')
  @ApiOperation({ summary: '增加使用次数' })
  @RequirePermissions(Permission.PAGES_VIEW)
  async incrementUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.seoTemplateService.incrementUsage(id, teamId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: '复制模板' })
  @RequirePermissions(Permission.PAGES_CREATE)
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.seoTemplateService.duplicate(id, teamId, user.sub);
  }
}
