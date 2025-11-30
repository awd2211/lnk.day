import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
  CurrentUser,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import { TemplateService } from './template.service';

@ApiTags('campaign-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('campaign-templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '创建活动模板' })
  create(
    @Body() data: any,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.templateService.create({ ...data, userId: user.sub, teamId });
  }

  @Post('from-campaign/:campaignId')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '从现有活动创建模板' })
  createFromCampaign(
    @Param('campaignId') campaignId: string,
    @Body() body: { name: string; description?: string; isPublic?: boolean; includeGoals?: boolean },
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.templateService.createFromCampaign(
      campaignId,
      body.name,
      user.sub,
      teamId,
      {
        description: body.description,
        isPublic: body.isPublic,
        includeGoals: body.includeGoals,
      },
    );
  }

  @Get()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取活动模板列表' })
  findAll(@ScopedTeamId() teamId: string) {
    return this.templateService.findAll(teamId);
  }

  @Get('public')
  @ApiOperation({ summary: '获取公开模板列表' })
  findPublic() {
    return this.templateService.findPublic();
  }

  @Get(':id')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取单个模板' })
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新模板' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.templateService.update(id, data);
  }

  @Delete(':id')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '删除模板' })
  delete(@Param('id') id: string) {
    return this.templateService.delete(id);
  }

  @Post(':id/create-campaign')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '从模板创建活动' })
  createCampaign(
    @Param('id') templateId: string,
    @Body()
    body: {
      name: string;
      startDate?: string;
      endDate?: string;
      budget?: number;
      overrides?: any;
    },
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.templateService.createCampaignFromTemplate(templateId, {
      name: body.name,
      userId: user.sub,
      teamId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      budget: body.budget,
      overrides: body.overrides,
    });
  }
}
