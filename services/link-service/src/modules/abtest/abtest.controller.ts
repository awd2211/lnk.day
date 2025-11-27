import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ABTestService } from './abtest.service';
import { CreateABTestDto } from './dto/create-abtest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
  @ApiOperation({ summary: '获取 A/B 测试统计' })
  getStats(@Param('id') id: string) {
    return this.abtestService.getStats(id);
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

  @Delete(':id')
  @ApiOperation({ summary: '删除 A/B 测试' })
  remove(@Param('id') id: string) {
    return this.abtestService.remove(id);
  }
}
