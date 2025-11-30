import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
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
  Public,
} from '@lnk/nestjs-common';
import { PageService } from './page.service';
import { PageStatus, PageBlock } from './entities/page.entity';

@ApiTags('pages')
@Controller('pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Post()
  @RequirePermissions(Permission.PAGES_CREATE)
  @ApiOperation({ summary: '创建落地页' })
  create(
    @Body() data: any,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.pageService.create({ ...data, userId: user.id, teamId });
  }

  @Get()
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '获取落地页列表' })
  @ApiQuery({ name: 'status', required: false, enum: PageStatus })
  findAll(@ScopedTeamId() teamId: string, @Query('status') status?: PageStatus) {
    return this.pageService.findAll(teamId, { status });
  }

  @Get('render/:slug')
  @Public()
  @ApiOperation({ summary: '渲染落地页' })
  async renderPage(@Param('slug') slug: string, @Res() res: Response) {
    const html = await this.pageService.renderPage(slug);
    await this.pageService.incrementViews((await this.pageService.findBySlug(slug)).id);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: '通过slug获取落地页数据' })
  findBySlug(@Param('slug') slug: string) {
    return this.pageService.findBySlug(slug);
  }

  @Get(':id')
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '获取单个落地页' })
  async findOne(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pageService.findOne(id);
    if (!isPlatformAdmin(user) && page.teamId !== teamId) {
      throw new ForbiddenException('无权访问此落地页');
    }
    return page;
  }

  @Put(':id')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '更新落地页' })
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pageService.findOne(id);
    if (!isPlatformAdmin(user) && page.teamId !== teamId) {
      throw new ForbiddenException('无权修改此落地页');
    }
    return this.pageService.update(id, data);
  }

  @Put(':id/blocks')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '更新落地页内容块' })
  async updateBlocks(
    @Param('id') id: string,
    @Body() blocks: PageBlock[],
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pageService.findOne(id);
    if (!isPlatformAdmin(user) && page.teamId !== teamId) {
      throw new ForbiddenException('无权修改此落地页');
    }
    return this.pageService.updateBlocks(id, blocks);
  }

  @Post(':id/publish')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '发布落地页' })
  async publish(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pageService.findOne(id);
    if (!isPlatformAdmin(user) && page.teamId !== teamId) {
      throw new ForbiddenException('无权发布此落地页');
    }
    return this.pageService.publish(id);
  }

  @Post(':id/unpublish')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '取消发布落地页' })
  async unpublish(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pageService.findOne(id);
    if (!isPlatformAdmin(user) && page.teamId !== teamId) {
      throw new ForbiddenException('无权取消发布此落地页');
    }
    return this.pageService.unpublish(id);
  }

  @Post(':id/archive')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '归档落地页' })
  async archive(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pageService.findOne(id);
    if (!isPlatformAdmin(user) && page.teamId !== teamId) {
      throw new ForbiddenException('无权归档此落地页');
    }
    return this.pageService.archive(id);
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.PAGES_CREATE)
  @ApiOperation({ summary: '复制落地页' })
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    const page = await this.pageService.findOne(id);
    if (!isPlatformAdmin(user) && page.teamId !== teamId) {
      throw new ForbiddenException('无权复制此落地页');
    }
    return this.pageService.duplicate(id, user.id, teamId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PAGES_DELETE)
  @ApiOperation({ summary: '删除落地页' })
  async remove(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pageService.findOne(id);
    if (!isPlatformAdmin(user) && page.teamId !== teamId) {
      throw new ForbiddenException('无权删除此落地页');
    }
    return this.pageService.remove(id);
  }
}
