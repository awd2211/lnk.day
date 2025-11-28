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
  ApiParam,
} from '@nestjs/swagger';

import { LinkTemplateService } from './link-template.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateLinkTemplateDto,
  UpdateLinkTemplateDto,
  CreateLinkFromTemplateDto,
  LinkTemplateQueryDto,
} from './dto/link-template.dto';
import { LinkTemplate, LinkTemplatePreset } from './entities/link-template.entity';

@ApiTags('link-templates')
@Controller('link-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LinkTemplateController {
  constructor(private readonly templateService: LinkTemplateService) {}

  // ========== Custom Templates ==========

  @Post()
  @ApiOperation({ summary: '创建链接模板' })
  async create(
    @Body() dto: CreateLinkTemplateDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<LinkTemplate> {
    return this.templateService.create(dto, userId, teamId || userId);
  }

  @Get()
  @ApiOperation({ summary: '获取模板列表' })
  async findAll(
    @Query() query: LinkTemplateQueryDto,
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<{ templates: LinkTemplate[]; total: number }> {
    return this.templateService.findAll(teamId || userId, query);
  }

  @Get('most-used')
  @ApiOperation({ summary: '获取最常用的模板' })
  async getMostUsed(
    @Query('limit') limit: number = 5,
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<LinkTemplate[]> {
    return this.templateService.getMostUsedTemplates(teamId || userId, limit);
  }

  @Get('recently-used')
  @ApiOperation({ summary: '获取最近使用的模板' })
  async getRecentlyUsed(
    @Query('limit') limit: number = 5,
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<LinkTemplate[]> {
    return this.templateService.getRecentlyUsedTemplates(teamId || userId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模板详情' })
  @ApiParam({ name: 'id', description: '模板ID' })
  async findOne(
    @Param('id') id: string,
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<LinkTemplate> {
    return this.templateService.findOne(id, teamId || userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新模板' })
  @ApiParam({ name: 'id', description: '模板ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLinkTemplateDto,
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<LinkTemplate> {
    return this.templateService.update(id, dto, teamId || userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除模板' })
  @ApiParam({ name: 'id', description: '模板ID' })
  async remove(
    @Param('id') id: string,
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<{ message: string }> {
    await this.templateService.remove(id, teamId || userId);
    return { message: 'Template deleted successfully' };
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: '切换模板收藏状态' })
  @ApiParam({ name: 'id', description: '模板ID' })
  async toggleFavorite(
    @Param('id') id: string,
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<LinkTemplate> {
    return this.templateService.toggleFavorite(id, teamId || userId);
  }

  // ========== Create Link From Template ==========

  @Post('use')
  @ApiOperation({ summary: '使用模板创建链接' })
  async createLinkFromTemplate(
    @Body() dto: CreateLinkFromTemplateDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.templateService.createLinkFromTemplate(dto, userId, teamId || userId);
  }

  // ========== Presets ==========

  @Get('presets/all')
  @ApiOperation({ summary: '获取所有预设模板' })
  async getPresets(): Promise<LinkTemplatePreset[]> {
    return this.templateService.getPresets();
  }

  @Get('presets/category/:category')
  @ApiOperation({ summary: '按分类获取预设模板' })
  @ApiParam({ name: 'category', description: '分类: marketing, social, email, qr, custom' })
  async getPresetsByCategory(
    @Param('category') category: string,
  ): Promise<LinkTemplatePreset[]> {
    return this.templateService.getPresetsByCategory(category);
  }

  @Post('presets/:presetId/create')
  @ApiOperation({ summary: '从预设创建自定义模板' })
  @ApiParam({ name: 'presetId', description: '预设模板ID' })
  async createFromPreset(
    @Param('presetId') presetId: string,
    @Body('name') name: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<LinkTemplate> {
    return this.templateService.createFromPreset(presetId, name, userId, teamId || userId);
  }

  // ========== Admin ==========

  @Post('presets/seed')
  @ApiOperation({ summary: '初始化预设模板（管理员）' })
  async seedPresets(): Promise<{ message: string }> {
    await this.templateService.seedPresets();
    return { message: 'Presets seeded successfully' };
  }
}
