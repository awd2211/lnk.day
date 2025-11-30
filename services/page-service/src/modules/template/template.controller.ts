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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';

import { TemplateService } from './template.service';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  AdminOnly,
  ScopedTeamId,
  CurrentUser,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  CreatePageFromTemplateDto,
} from './dto/template.dto';
import { PageTemplate, TemplateCategory } from './entities/page-template.entity';

@ApiTags('templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  // ========== Public endpoints (no auth required) ==========

  @Get()
  @ApiOperation({ summary: '获取模板列表' })
  @ApiQuery({ name: 'category', required: false, enum: TemplateCategory })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: TemplateQueryDto) {
    return this.templateService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: '获取精选模板' })
  async getFeatured(): Promise<PageTemplate[]> {
    return this.templateService.getFeatured();
  }

  @Get('categories')
  @ApiOperation({ summary: '获取模板分类列表' })
  getCategories() {
    return {
      categories: [
        { id: TemplateCategory.PERSONAL, name: '个人', icon: 'user' },
        { id: TemplateCategory.BUSINESS, name: '商业', icon: 'briefcase' },
        { id: TemplateCategory.SOCIAL, name: '社交媒体', icon: 'share' },
        { id: TemplateCategory.EVENT, name: '活动', icon: 'calendar' },
        { id: TemplateCategory.PRODUCT, name: '产品', icon: 'box' },
        { id: TemplateCategory.CREATIVE, name: '创意', icon: 'palette' },
      ],
    };
  }

  @Get('category/:category')
  @ApiOperation({ summary: '获取指定分类的模板' })
  async getByCategory(
    @Param('category') category: TemplateCategory,
  ): Promise<PageTemplate[]> {
    return this.templateService.getByCategory(category);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模板详情' })
  async findOne(@Param('id') id: string): Promise<PageTemplate> {
    return this.templateService.findOne(id);
  }

  // ========== Admin endpoints ==========

  @Post()
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '创建模板（管理员）' })
  async create(
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PageTemplate> {
    return this.templateService.create(dto, user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '更新模板（管理员）' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ): Promise<PageTemplate> {
    return this.templateService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '删除模板（管理员）' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.templateService.remove(id);
    return { message: 'Template deleted successfully' };
  }

  // ========== User endpoints ==========

  @Post(':id/use')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.PAGES_CREATE)
  @ApiOperation({ summary: '使用模板创建页面' })
  async useTemplate(
    @Param('id') templateId: string,
    @Body() dto: CreatePageFromTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.templateService.createPageFromTemplate(
      templateId,
      dto.name,
      dto.slug,
      user.sub,
      teamId,
    );
  }

  // ========== Favorites ==========

  @Get('favorites/me')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '获取我收藏的模板' })
  async getMyFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.templateService.getUserFavorites(user.sub, { page, limit });
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '收藏模板' })
  async addFavorite(
    @Param('id') templateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.templateService.addFavorite(user.sub, templateId);
    return { message: 'Template favorited successfully' };
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '取消收藏模板' })
  async removeFavorite(
    @Param('id') templateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.templateService.removeFavorite(user.sub, templateId);
    return { message: 'Template unfavorited successfully' };
  }

  @Get(':id/favorited')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '检查是否已收藏' })
  async checkFavorited(
    @Param('id') templateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ favorited: boolean }> {
    const favorited = await this.templateService.isFavorited(user.sub, templateId);
    return { favorited };
  }

  // ========== Admin ==========

  @Post('seed')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '初始化默认模板（管理员）' })
  async seedTemplates(): Promise<{ message: string }> {
    await this.templateService.seedDefaultTemplates();
    return { message: 'Default templates seeded successfully' };
  }
}
