import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { SchedulerService } from './scheduler.service';
import { CreateAutomationWorkflowDto } from './dto/create-automation-workflow.dto';
import { UpdateAutomationWorkflowDto } from './dto/update-automation-workflow.dto';
import { TriggerType } from './entities/automation-workflow.entity';

@ApiTags('automation')
@Controller('system/automation')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@UseInterceptors(AuditLogInterceptor)
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取自动化工作流列表' })
  async findAll(
    @Query('search') search?: string,
    @Query('trigger') trigger?: TriggerType,
    @Query('status') status?: 'enabled' | 'disabled',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationService.findAll({
      search,
      trigger,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取自动化工作流统计' })
  async getStats() {
    return this.automationService.getStats();
  }

  @Get('scheduled-jobs')
  @ApiOperation({ summary: '获取定时任务状态' })
  async getScheduledJobs() {
    return this.schedulerService.getScheduledJobsStatus();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个自动化工作流' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建自动化工作流' })
  @LogAudit({
    action: 'automation.workflow.create',
    targetType: 'automation_workflow',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'trigger'],
  })
  async create(@Body() dto: CreateAutomationWorkflowDto) {
    const workflow = await this.automationService.create(dto);
    // 如果是定时任务类型，需要注册到调度器
    if (dto.trigger?.type === 'schedule' && dto.enabled !== false) {
      await this.schedulerService.scheduleWorkflow(workflow);
    }
    return workflow;
  }

  @Put(':id')
  @ApiOperation({ summary: '更新自动化工作流' })
  @LogAudit({
    action: 'automation.workflow.update',
    targetType: 'automation_workflow',
    targetIdParam: 'id',
    detailFields: ['name', 'trigger'],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationWorkflowDto,
  ) {
    const workflow = await this.automationService.update(id, dto);
    // 重新加载调度器
    await this.schedulerService.reloadWorkflow(id);
    return workflow;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除自动化工作流' })
  @LogAudit({
    action: 'automation.workflow.delete',
    targetType: 'automation_workflow',
    targetIdParam: 'id',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    // 先从调度器中移除
    await this.schedulerService.unscheduleWorkflow(id);
    await this.automationService.remove(id);
    return { success: true };
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: '切换工作流启用状态' })
  @LogAudit({
    action: 'automation.workflow.toggle',
    targetType: 'automation_workflow',
    targetIdParam: 'id',
  })
  async toggleEnabled(@Param('id', ParseUUIDPipe) id: string) {
    const workflow = await this.automationService.toggleEnabled(id);
    // 重新加载调度器
    await this.schedulerService.reloadWorkflow(id);
    return workflow;
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: '复制工作流' })
  @LogAudit({
    action: 'automation.workflow.duplicate',
    targetType: 'automation_workflow',
    targetIdParam: 'id',
  })
  async duplicate(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationService.duplicate(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: '手动执行工作流' })
  @LogAudit({
    action: 'automation.workflow.execute',
    targetType: 'automation_workflow',
    targetIdParam: 'id',
  })
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { inputData?: Record<string, any> },
  ) {
    return this.automationService.execute(id, body.inputData);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '获取工作流执行日志' })
  async getExecutionLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationService.getExecutionLogs(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
