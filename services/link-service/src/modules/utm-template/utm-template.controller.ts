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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
  isPlatformAdmin,
} from '@lnk/nestjs-common';
import { UTMTemplateService, UTM_SUGGESTIONS } from './utm-template.service';

interface CreateUTMTemplateDto {
  name: string;
  description?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  isDefault?: boolean;
  tags?: string[];
}

interface UpdateUTMTemplateDto extends Partial<CreateUTMTemplateDto> {}

@ApiTags('utm-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('utm-templates')
export class UTMTemplateController {
  constructor(private readonly utmTemplateService: UTMTemplateService) {}

  @Post()
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '创建 UTM 模板' })
  create(
    @Body() dto: CreateUTMTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.utmTemplateService.create(dto, user.id, teamId);
  }

  @Get()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取 UTM 模板列表' })
  @ApiQuery({ name: 'tags', required: false, description: '按标签筛选 (逗号分隔)' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  findAll(
    @ScopedTeamId() teamId: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
  ) {
    return this.utmTemplateService.findAll(teamId, {
      tags: tags ? tags.split(',') : undefined,
      search,
    });
  }

  @Get('suggestions')
  @ApiOperation({ summary: '获取 UTM 参数建议' })
  getSuggestions() {
    return this.utmTemplateService.getSuggestions();
  }

  @Get('stats')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取 UTM 模板统计' })
  getStats(@ScopedTeamId() teamId: string) {
    return this.utmTemplateService.getStats(teamId);
  }

  @Get('default')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取默认 UTM 模板' })
  async findDefault(@ScopedTeamId() teamId: string) {
    const template = await this.utmTemplateService.findDefault(teamId);
    return template || { message: 'No default template set' };
  }

  @Get(':id')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取单个 UTM 模板' })
  async findOne(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const template = await this.utmTemplateService.findOne(id);
    if (!isPlatformAdmin(user) && template.teamId !== teamId) {
      throw new ForbiddenException('无权访问此模板');
    }
    return template;
  }

  @Put(':id')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '更新 UTM 模板' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUTMTemplateDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const template = await this.utmTemplateService.findOne(id);
    if (!isPlatformAdmin(user) && template.teamId !== teamId) {
      throw new ForbiddenException('无权修改此模板');
    }
    return this.utmTemplateService.update(id, dto);
  }

  @Post(':id/set-default')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '设为默认模板' })
  async setDefault(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.utmTemplateService.setDefault(id, teamId);
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '复制 UTM 模板' })
  async duplicate(
    @Param('id') id: string,
    @Body() body: { name?: string },
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    const template = await this.utmTemplateService.findOne(id);
    if (!isPlatformAdmin(user) && template.teamId !== teamId) {
      throw new ForbiddenException('无权复制此模板');
    }
    return this.utmTemplateService.duplicate(id, user.id, body.name);
  }

  @Delete(':id')
  @RequirePermissions(Permission.LINKS_DELETE)
  @ApiOperation({ summary: '删除 UTM 模板' })
  async delete(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const template = await this.utmTemplateService.findOne(id);
    if (!isPlatformAdmin(user) && template.teamId !== teamId) {
      throw new ForbiddenException('无权删除此模板');
    }
    return this.utmTemplateService.delete(id);
  }

  // UTM 工具端点
  @Post('build-url')
  @ApiOperation({ summary: '构建带 UTM 参数的 URL' })
  buildUrl(
    @Body()
    body: {
      url: string;
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    },
  ) {
    const { url, ...params } = body;
    return {
      originalUrl: url,
      urlWithUTM: this.utmTemplateService.buildUTMUrl(url, params),
    };
  }

  @Post('parse-url')
  @ApiOperation({ summary: '解析 URL 中的 UTM 参数' })
  parseUrl(@Body() body: { url: string }) {
    return this.utmTemplateService.parseUTMParams(body.url);
  }

  @Post(':id/apply')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '应用 UTM 模板到 URL' })
  async applyTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      url: string;
      overrides?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
      };
    },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const template = await this.utmTemplateService.findOne(id);
    if (!isPlatformAdmin(user) && template.teamId !== teamId) {
      throw new ForbiddenException('无权使用此模板');
    }

    const params = await this.utmTemplateService.applyTemplate(id, body.overrides);
    return {
      originalUrl: body.url,
      urlWithUTM: this.utmTemplateService.buildUTMUrl(body.url, params),
      params,
    };
  }

  @Post(':id/bulk-apply')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '批量应用 UTM 模板到多个 URL' })
  async bulkApplyTemplate(
    @Param('id') id: string,
    @Body() body: { urls: string[] },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const template = await this.utmTemplateService.findOne(id);
    if (!isPlatformAdmin(user) && template.teamId !== teamId) {
      throw new ForbiddenException('无权使用此模板');
    }
    return this.utmTemplateService.bulkApplyTemplate(id, body.urls);
  }
}
