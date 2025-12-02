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
import { DeepLinkTemplateService } from './template.service';
import { CreateDeepLinkTemplateDto } from './dto/create-deeplink-template.dto';
import { UpdateDeepLinkTemplateDto } from './dto/update-deeplink-template.dto';

@ApiTags('DeepLink Templates')
@ApiBearerAuth()
@Controller('deeplink-templates')
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class DeepLinkTemplateController {
  constructor(private readonly templateService: DeepLinkTemplateService) {}

  @Post()
  @ApiOperation({ summary: '创建深度链接模板' })
  @RequirePermissions(Permission.DEEPLINKS_CREATE)
  async create(
    @ScopedTeamId() teamId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDeepLinkTemplateDto,
  ) {
    return this.templateService.create(teamId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取深度链接模板列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @RequirePermissions(Permission.DEEPLINKS_VIEW)
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isFavorite') isFavorite?: boolean,
    @Query('search') search?: string,
  ) {
    return this.templateService.findAll(teamId, { page, limit, isFavorite, search });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取深度链接模板详情' })
  @RequirePermissions(Permission.DEEPLINKS_VIEW)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.templateService.findOne(id, teamId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新深度链接模板' })
  @RequirePermissions(Permission.DEEPLINKS_EDIT)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateDeepLinkTemplateDto,
  ) {
    return this.templateService.update(id, teamId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除深度链接模板' })
  @RequirePermissions(Permission.DEEPLINKS_DELETE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.templateService.remove(id, teamId);
    return { success: true };
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: '切换模板收藏状态' })
  @RequirePermissions(Permission.DEEPLINKS_EDIT)
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.templateService.toggleFavorite(id, teamId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: '复制模板' })
  @RequirePermissions(Permission.DEEPLINKS_CREATE)
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
  @RequirePermissions(Permission.DEEPLINKS_VIEW)
  async use(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.templateService.incrementUsage(id, teamId);
    return { success: true };
  }
}
