import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminOnly, Public } from '@lnk/nestjs-common';
import { PlanService, CreatePlanDto, UpdatePlanDto } from './plan.service';

@ApiTags('plans')
@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取所有套餐' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.planService.findAll(includeInactive === 'true');
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: '获取公开的套餐（用于定价页面）' })
  findPublic() {
    return this.planService.findPublic();
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '获取套餐统计' })
  getStats() {
    return this.planService.getStats();
  }

  @Get('default')
  @Public()
  @ApiOperation({ summary: '获取默认套餐' })
  findDefault() {
    return this.planService.findDefault();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '获取套餐详情' })
  findById(@Param('id') id: string) {
    return this.planService.findById(id);
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({ summary: '根据代码获取套餐' })
  findByCode(@Param('code') code: string) {
    return this.planService.findByCode(code);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '创建套餐' })
  create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '更新套餐' })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '删除套餐' })
  delete(@Param('id') id: string) {
    return this.planService.delete(id);
  }

  @Patch(':id/toggle')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '切换套餐激活状态' })
  toggleActive(@Param('id') id: string) {
    return this.planService.toggleActive(id);
  }

  @Post(':id/duplicate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '复制套餐' })
  duplicate(
    @Param('id') id: string,
    @Body() body: { code: string; name: string },
  ) {
    return this.planService.duplicate(id, body.code, body.name);
  }

  @Put('sort-order')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '更新排序顺序' })
  updateSortOrder(@Body() orders: { id: string; sortOrder: number }[]) {
    return this.planService.updateSortOrder(orders);
  }

  @Get('compare/:code1/:code2')
  @Public()
  @ApiOperation({ summary: '比较两个套餐' })
  comparePlans(@Param('code1') code1: string, @Param('code2') code2: string) {
    return this.planService.comparePlans(code1, code2);
  }

  @Post('refresh-cache')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @AdminOnly()
  @ApiOperation({ summary: '刷新套餐缓存' })
  refreshCache() {
    return this.planService.refreshCache();
  }
}
