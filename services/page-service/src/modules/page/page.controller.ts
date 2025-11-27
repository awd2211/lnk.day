import { Controller, Get, Post, Put, Delete, Body, Param, Headers, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { PageService } from './page.service';
import { PageStatus, PageBlock } from './entities/page.entity';

@ApiTags('pages')
@Controller('pages')
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建落地页' })
  create(
    @Body() data: any,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.pageService.create({ ...data, userId, teamId });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取落地页列表' })
  @ApiQuery({ name: 'status', required: false, enum: PageStatus })
  findAll(@Headers('x-team-id') teamId: string, @Query('status') status?: PageStatus) {
    return this.pageService.findAll(teamId, { status });
  }

  @Get('render/:slug')
  @ApiOperation({ summary: '渲染落地页' })
  async renderPage(@Param('slug') slug: string, @Res() res: Response) {
    const html = await this.pageService.renderPage(slug);
    await this.pageService.incrementViews((await this.pageService.findBySlug(slug)).id);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: '通过slug获取落地页数据' })
  findBySlug(@Param('slug') slug: string) {
    return this.pageService.findBySlug(slug);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个落地页' })
  findOne(@Param('id') id: string) {
    return this.pageService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新落地页' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.pageService.update(id, data);
  }

  @Put(':id/blocks')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新落地页内容块' })
  updateBlocks(@Param('id') id: string, @Body() blocks: PageBlock[]) {
    return this.pageService.updateBlocks(id, blocks);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布落地页' })
  publish(@Param('id') id: string) {
    return this.pageService.publish(id);
  }

  @Post(':id/unpublish')
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消发布落地页' })
  unpublish(@Param('id') id: string) {
    return this.pageService.unpublish(id);
  }

  @Post(':id/archive')
  @ApiBearerAuth()
  @ApiOperation({ summary: '归档落地页' })
  archive(@Param('id') id: string) {
    return this.pageService.archive(id);
  }

  @Post(':id/duplicate')
  @ApiBearerAuth()
  @ApiOperation({ summary: '复制落地页' })
  duplicate(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.pageService.duplicate(id, userId, teamId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除落地页' })
  remove(@Param('id') id: string) {
    return this.pageService.remove(id);
  }
}
