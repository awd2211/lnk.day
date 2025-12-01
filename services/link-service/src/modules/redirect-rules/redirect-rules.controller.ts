import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { RedirectRulesService, VisitorContext } from './redirect-rules.service';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
} from '@lnk/nestjs-common';
import {
  CreateRedirectRuleDto,
  UpdateRedirectRuleDto,
  RedirectRuleResponseDto,
  EvaluateRulesDto,
} from './dto/redirect-rule.dto';
import { RedirectRule } from './entities/redirect-rule.entity';

@ApiTags('redirect-rules')
@Controller('links/:linkId/redirect-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class RedirectRulesController {
  constructor(private readonly redirectRulesService: RedirectRulesService) {}

  @Post()
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '创建跳转规则' })
  @ApiParam({ name: 'linkId', type: String })
  @ApiResponse({ status: 201, type: RedirectRuleResponseDto })
  async create(
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() dto: CreateRedirectRuleDto,
  ): Promise<RedirectRule> {
    return this.redirectRulesService.create(linkId, dto);
  }

  @Get()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取链接的所有跳转规则' })
  @ApiParam({ name: 'linkId', type: String })
  @ApiResponse({ status: 200, type: [RedirectRuleResponseDto] })
  async findAll(
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    return this.redirectRulesService.findAllByLinkFormatted(linkId);
  }

  @Get('stats')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取跳转规则统计' })
  @ApiParam({ name: 'linkId', type: String })
  async getStats(@Param('linkId', ParseUUIDPipe) linkId: string) {
    return this.redirectRulesService.getStats(linkId);
  }

  @Get(':id')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取跳转规则详情' })
  @ApiParam({ name: 'linkId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: RedirectRuleResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.redirectRulesService.findOneFormatted(id);
  }

  @Put(':id')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '更新跳转规则' })
  @ApiParam({ name: 'linkId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: RedirectRuleResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRedirectRuleDto,
  ): Promise<RedirectRule> {
    return this.redirectRulesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.LINKS_DELETE)
  @ApiOperation({ summary: '删除跳转规则' })
  @ApiParam({ name: 'linkId', type: String })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.redirectRulesService.remove(id);
    return { message: 'Redirect rule deleted successfully' };
  }

  @Post(':id/toggle')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '切换规则启用/禁用状态' })
  @ApiParam({ name: 'linkId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: RedirectRuleResponseDto })
  async toggleEnabled(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RedirectRule> {
    return this.redirectRulesService.toggleEnabled(id);
  }

  @Post('reorder')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '重新排序规则优先级' })
  @ApiParam({ name: 'linkId', type: String })
  @ApiResponse({ status: 200, type: [RedirectRuleResponseDto] })
  async reorder(
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() body: { ruleIds: string[] },
  ): Promise<RedirectRule[]> {
    return this.redirectRulesService.reorder(linkId, body.ruleIds);
  }

  @Post('evaluate')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '测试规则匹配（模拟访问者）' })
  @ApiParam({ name: 'linkId', type: String })
  async evaluate(
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() dto: EvaluateRulesDto,
  ) {
    const context: VisitorContext = {
      country: dto.country,
      region: dto.region,
      city: dto.city,
      deviceType: dto.deviceType,
      os: dto.os,
      osVersion: dto.osVersion,
      browser: dto.browser,
      language: dto.language,
      referrer: dto.referrer,
      queryParams: dto.queryParams,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
    };

    const result = await this.redirectRulesService.evaluateRules(linkId, context);

    return {
      matched: result.matched,
      targetUrl: result.targetUrl,
      matchedRule: result.rule ? {
        id: result.rule.id,
        name: result.rule.name,
        types: result.rule.types,
      } : null,
      matchedConditions: result.matchedConditions,
      testedContext: context,
    };
  }

  @Post('duplicate')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '复制规则到另一个链接' })
  @ApiParam({ name: 'linkId', type: String })
  async duplicate(
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() body: { targetLinkId: string },
  ): Promise<RedirectRule[]> {
    return this.redirectRulesService.duplicateRules(linkId, body.targetLinkId);
  }
}

// Internal API for redirect-service to call
@ApiTags('internal')
@Controller('internal/redirect-rules')
export class InternalRedirectRulesController {
  constructor(private readonly redirectRulesService: RedirectRulesService) {}

  @Post('evaluate/:linkId')
  @ApiOperation({ summary: '内部API - 评估跳转规则' })
  async evaluateForRedirect(
    @Param('linkId') linkId: string,
    @Body() context: VisitorContext,
  ) {
    return this.redirectRulesService.evaluateRules(linkId, context);
  }
}
