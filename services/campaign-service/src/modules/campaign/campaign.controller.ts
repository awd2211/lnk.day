import { Controller, Get, Post, Put, Delete, Body, Param, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@lnk/nestjs-common';
import { CampaignService } from './campaign.service';
import { CampaignStatus, UTMParams } from './entities/campaign.entity';

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建营销活动' })
  create(
    @Body() data: any,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.campaignService.create({ ...data, userId, teamId });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取营销活动列表' })
  @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
  findAll(@Headers('x-team-id') teamId: string, @Query('status') status?: CampaignStatus) {
    return this.campaignService.findAll(teamId, { status });
  }

  @Get('active')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取进行中的营销活动' })
  findActive(@Headers('x-team-id') teamId: string) {
    return this.campaignService.findActive(teamId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个营销活动' })
  findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取营销活动统计' })
  getStats(@Param('id') id: string) {
    return this.campaignService.getStats(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新营销活动' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.campaignService.update(id, data);
  }

  @Post(':id/start')
  @ApiBearerAuth()
  @ApiOperation({ summary: '启动营销活动' })
  start(@Param('id') id: string) {
    return this.campaignService.start(id);
  }

  @Post(':id/pause')
  @ApiBearerAuth()
  @ApiOperation({ summary: '暂停营销活动' })
  pause(@Param('id') id: string) {
    return this.campaignService.pause(id);
  }

  @Post(':id/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: '结束营销活动' })
  complete(@Param('id') id: string) {
    return this.campaignService.complete(id);
  }

  @Post(':id/archive')
  @ApiBearerAuth()
  @ApiOperation({ summary: '归档营销活动' })
  archive(@Param('id') id: string) {
    return this.campaignService.archive(id);
  }

  @Post(':id/links')
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加链接到营销活动' })
  addLinks(@Param('id') id: string, @Body() body: { linkIds: string[] }) {
    return this.campaignService.addLinks(id, body.linkIds);
  }

  @Delete(':id/links')
  @ApiBearerAuth()
  @ApiOperation({ summary: '从营销活动移除链接' })
  removeLinks(@Param('id') id: string, @Body() body: { linkIds: string[] }) {
    return this.campaignService.removeLinks(id, body.linkIds);
  }

  @Post(':id/duplicate')
  @ApiBearerAuth()
  @ApiOperation({ summary: '复制营销活动' })
  duplicate(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.campaignService.duplicate(id, userId, teamId);
  }

  @Post('utm-builder')
  @ApiOperation({ summary: 'UTM URL 构建器' })
  buildUtmUrl(@Body() body: { baseUrl: string; utmParams: UTMParams }) {
    return { url: this.campaignService.buildUtmUrl(body.baseUrl, body.utmParams) };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除营销活动' })
  remove(@Param('id') id: string) {
    return this.campaignService.remove(id);
  }
}
