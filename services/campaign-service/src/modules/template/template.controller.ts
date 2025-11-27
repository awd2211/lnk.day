import { Controller, Get, Post, Put, Delete, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplateService } from './template.service';

@ApiTags('campaign-templates')
@Controller('campaign-templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建活动模板' })
  create(
    @Body() data: any,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.templateService.create({ ...data, userId, teamId });
  }

  @Post('from-campaign/:campaignId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '从现有活动创建模板' })
  createFromCampaign(
    @Param('campaignId') campaignId: string,
    @Body() body: { name: string; description?: string; isPublic?: boolean; includeGoals?: boolean },
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.templateService.createFromCampaign(
      campaignId,
      body.name,
      userId,
      teamId,
      {
        description: body.description,
        isPublic: body.isPublic,
        includeGoals: body.includeGoals,
      },
    );
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取活动模板列表' })
  findAll(@Headers('x-team-id') teamId: string) {
    return this.templateService.findAll(teamId);
  }

  @Get('public')
  @ApiOperation({ summary: '获取公开模板列表' })
  findPublic() {
    return this.templateService.findPublic();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个模板' })
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新模板' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.templateService.update(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除模板' })
  delete(@Param('id') id: string) {
    return this.templateService.delete(id);
  }

  @Post(':id/create-campaign')
  @ApiBearerAuth()
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
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.templateService.createCampaignFromTemplate(templateId, {
      name: body.name,
      userId,
      teamId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      budget: body.budget,
      overrides: body.overrides,
    });
  }
}
