import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard, CurrentUser } from '@lnk/nestjs-common';
import { ABTestService } from './abtest.service';
import { CreateABTestDto } from './dto/create-abtest.dto';

@ApiTags('ab-tests')
@Controller('ab-tests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ABTestController {
  constructor(private readonly abtestService: ABTestService) {}

  @Post()
  @ApiOperation({ summary: '创建 A/B 测试' })
  create(
    @Body() createDto: CreateABTestDto,
    @CurrentUser() user: { id: string },
    @Headers('x-team-id') teamId: string,
  ) {
    return this.abtestService.create(createDto, user.id, teamId || user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取 A/B 测试列表' })
  findAll(
    @Headers('x-team-id') teamId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.abtestService.findAll(teamId || user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 A/B 测试' })
  findOne(@Param('id') id: string) {
    return this.abtestService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '获取 A/B 测试统计（含统计显著性分析）' })
  getStats(@Param('id') id: string) {
    return this.abtestService.getStats(id);
  }

  @Get(':id/comparison')
  @ApiOperation({ summary: '获取变体详细对比' })
  getComparison(@Param('id') id: string) {
    return this.abtestService.getVariantComparison(id);
  }

  @Get('link/:linkId')
  @ApiOperation({ summary: '获取链接的运行中 A/B 测试' })
  findByLinkId(@Param('linkId') linkId: string) {
    return this.abtestService.findByLinkId(linkId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: '启动 A/B 测试' })
  start(@Param('id') id: string) {
    return this.abtestService.start(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: '暂停 A/B 测试' })
  pause(@Param('id') id: string) {
    return this.abtestService.pause(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '结束 A/B 测试' })
  complete(
    @Param('id') id: string,
    @Body() body: { winnerVariantId?: string },
  ) {
    return this.abtestService.complete(id, body.winnerVariantId);
  }

  @Post(':id/events')
  @ApiOperation({ summary: '记录测试事件（点击、转化等）' })
  recordEvent(
    @Param('id') testId: string,
    @Body()
    body: {
      variantId: string;
      visitorId: string;
      eventType: 'click' | 'conversion' | 'bounce' | 'engagement';
      value?: number;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      country?: string;
      device?: string;
    },
  ) {
    return this.abtestService.recordEvent(
      testId,
      body.variantId,
      body.visitorId,
      body.eventType,
      {
        value: body.value,
        metadata: body.metadata,
        ipAddress: body.ipAddress,
        userAgent: body.userAgent,
        country: body.country,
        device: body.device,
      },
    );
  }

  @Get(':id/select-variant')
  @ApiOperation({ summary: '为访客选择变体（用于流量分配）' })
  @ApiQuery({ name: 'visitorId', required: true })
  @ApiQuery({ name: 'useBandit', required: false })
  async selectVariant(
    @Param('id') id: string,
    @Query('visitorId') visitorId: string,
    @Query('useBandit') useBandit?: string,
  ) {
    const abtest = await this.abtestService.findOne(id);

    const variant = useBandit === 'true'
      ? await this.abtestService.selectVariantBandit(abtest, visitorId)
      : this.abtestService.selectVariant(abtest, visitorId);

    return {
      variantId: variant.id,
      variantName: variant.name,
      targetUrl: variant.targetUrl,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 A/B 测试' })
  remove(@Param('id') id: string) {
    return this.abtestService.remove(id);
  }
}
