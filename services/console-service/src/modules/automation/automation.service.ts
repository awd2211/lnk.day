import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AutomationWorkflow, TriggerType } from './entities/automation-workflow.entity';
import { AutomationExecutionLog } from './entities/automation-execution-log.entity';
import { CreateAutomationWorkflowDto } from './dto/create-automation-workflow.dto';
import { UpdateAutomationWorkflowDto } from './dto/update-automation-workflow.dto';
import { ActionExecutorService, ActionContext } from './action-executor.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationWorkflow)
    private readonly workflowRepository: Repository<AutomationWorkflow>,
    @InjectRepository(AutomationExecutionLog)
    private readonly logRepository: Repository<AutomationExecutionLog>,
    private readonly actionExecutor: ActionExecutorService,
  ) {}

  async findAll(params: {
    search?: string;
    trigger?: TriggerType;
    status?: 'enabled' | 'disabled';
    page?: number;
    limit?: number;
  }) {
    const { search, trigger, status, page = 1, limit = 20 } = params;

    const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');

    if (search) {
      queryBuilder.where('workflow.name ILIKE :search', { search: `%${search}%` });
    }

    if (trigger) {
      queryBuilder.andWhere("workflow.trigger->>'type' = :trigger", { trigger });
    }

    if (status === 'enabled') {
      queryBuilder.andWhere('workflow.enabled = true');
    } else if (status === 'disabled') {
      queryBuilder.andWhere('workflow.enabled = false');
    }

    const [items, total] = await queryBuilder
      .orderBy('workflow.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AutomationWorkflow> {
    const workflow = await this.workflowRepository.findOne({ where: { id } });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return workflow;
  }

  /**
   * 查找匹配特定事件的所有启用工作流
   */
  async findWorkflowsByEvent(eventType: string): Promise<AutomationWorkflow[]> {
    return this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.enabled = true')
      .andWhere("workflow.trigger->>'type' = 'event'")
      .andWhere("workflow.trigger->'config'->>'eventType' = :eventType", { eventType })
      .getMany();
  }

  /**
   * 查找所有启用的定时任务工作流
   */
  async findScheduledWorkflows(): Promise<AutomationWorkflow[]> {
    return this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.enabled = true')
      .andWhere("workflow.trigger->>'type' = 'schedule'")
      .getMany();
  }

  async create(dto: CreateAutomationWorkflowDto): Promise<AutomationWorkflow> {
    const workflow = this.workflowRepository.create({
      ...dto,
      enabled: dto.enabled ?? true,
    });
    return this.workflowRepository.save(workflow);
  }

  async update(id: string, dto: UpdateAutomationWorkflowDto): Promise<AutomationWorkflow> {
    const workflow = await this.findOne(id);
    Object.assign(workflow, dto);
    return this.workflowRepository.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowRepository.remove(workflow);
  }

  async toggleEnabled(id: string): Promise<AutomationWorkflow> {
    const workflow = await this.findOne(id);
    workflow.enabled = !workflow.enabled;
    return this.workflowRepository.save(workflow);
  }

  async duplicate(id: string): Promise<AutomationWorkflow> {
    const original = await this.findOne(id);
    const copy = this.workflowRepository.create({
      name: `${original.name} (副本)`,
      description: original.description,
      trigger: original.trigger,
      actions: original.actions,
      conditions: original.conditions,
      enabled: false,
    });
    return this.workflowRepository.save(copy);
  }

  /**
   * 手动执行工作流
   */
  async execute(id: string, inputData?: Record<string, any>): Promise<AutomationExecutionLog> {
    const workflow = await this.findOne(id);
    return this.executeWorkflow(workflow, 'manual', inputData);
  }

  /**
   * 事件触发执行工作流
   */
  async executeWithEvent(
    id: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<AutomationExecutionLog> {
    const workflow = await this.findOne(id);

    // 检查条件
    if (!this.evaluateConditions(workflow.conditions, eventData)) {
      this.logger.debug(`Workflow "${workflow.name}" conditions not met, skipping execution`);
      return this.createSkippedLog(workflow.id, eventType, eventData, 'Conditions not met');
    }

    return this.executeWorkflow(workflow, eventType, eventData);
  }

  /**
   * 定时任务执行工作流
   */
  async executeScheduled(id: string): Promise<AutomationExecutionLog> {
    const workflow = await this.findOne(id);
    return this.executeWorkflow(workflow, 'schedule', {
      scheduledAt: new Date().toISOString(),
      cronExpression: workflow.trigger.config?.cronExpression,
    });
  }

  /**
   * 核心执行逻辑
   */
  private async executeWorkflow(
    workflow: AutomationWorkflow,
    triggerEvent: string,
    eventData?: Record<string, any>,
  ): Promise<AutomationExecutionLog> {
    const log = this.logRepository.create({
      workflowId: workflow.id,
      status: 'running',
      inputData: eventData,
      triggerEvent,
    });
    await this.logRepository.save(log);

    const context: ActionContext = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      triggerEvent,
      eventData,
    };

    const actionResults: Record<string, any>[] = [];
    let hasError = false;
    let errorMessage = '';

    try {
      this.logger.log(`Executing workflow "${workflow.name}" triggered by ${triggerEvent}`);

      // 按顺序执行所有动作
      const actions = workflow.actions || [];
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;
        this.logger.debug(`Executing action ${i + 1}/${actions.length}: ${action.type}`);

        const result = await this.actionExecutor.execute(action, context);
        actionResults.push({
          actionIndex: i,
          actionType: action.type,
          ...result,
        });

        if (!result.success) {
          hasError = true;
          errorMessage = `Action ${i + 1} (${action.type}) failed: ${result.error}`;
          this.logger.error(errorMessage);
          // 继续执行后续动作还是停止？这里选择停止
          break;
        }

        // 将当前动作的输出添加到上下文中，供后续动作使用
        if (result.output) {
          context.eventData = {
            ...context.eventData,
            [`_action${i}_output`]: result.output,
          };
        }
      }

      // 更新执行日志
      log.status = hasError ? 'failed' : 'success';
      log.completedAt = new Date();
      log.outputData = { actions: actionResults };
      if (hasError) {
        log.error = errorMessage;
      }

      // 更新工作流统计
      workflow.executionCount += 1;
      workflow.lastExecuted = new Date();
      workflow.lastStatus = hasError ? 'failed' : 'success';
      await this.workflowRepository.save(workflow);

      this.logger.log(
        `Workflow "${workflow.name}" ${hasError ? 'failed' : 'completed'} - ` +
          `${actionResults.length} action(s) executed`,
      );
    } catch (error: any) {
      log.status = 'failed';
      log.completedAt = new Date();
      log.error = error?.message || 'Unknown error';
      log.outputData = { actions: actionResults };

      workflow.executionCount += 1;
      workflow.lastExecuted = new Date();
      workflow.lastStatus = 'failed';
      await this.workflowRepository.save(workflow);

      this.logger.error(`Workflow "${workflow.name}" error: ${error.message}`);
    }

    return this.logRepository.save(log);
  }

  /**
   * 创建跳过执行的日志
   */
  private async createSkippedLog(
    workflowId: string,
    triggerEvent: string,
    inputData: Record<string, any>,
    reason: string,
  ): Promise<AutomationExecutionLog> {
    const log = this.logRepository.create({
      workflowId,
      status: 'success', // 跳过也算成功（条件不满足不是错误）
      inputData,
      triggerEvent,
      outputData: { skipped: true, reason },
      completedAt: new Date(),
    });
    return this.logRepository.save(log);
  }

  /**
   * 评估条件
   */
  private evaluateConditions(
    conditions: { field: string; operator: string; value: any }[] | undefined,
    data: Record<string, any>,
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // 没有条件，直接通过
    }

    return conditions.every((condition) => {
      const fieldValue = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'equals':
        case 'eq':
          return fieldValue === condition.value;
        case 'not_equals':
        case 'ne':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'not_contains':
          return !String(fieldValue).includes(String(condition.value));
        case 'greater_than':
        case 'gt':
          return Number(fieldValue) > Number(condition.value);
        case 'less_than':
        case 'lt':
          return Number(fieldValue) < Number(condition.value);
        case 'greater_than_or_equal':
        case 'gte':
          return Number(fieldValue) >= Number(condition.value);
        case 'less_than_or_equal':
        case 'lte':
          return Number(fieldValue) <= Number(condition.value);
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'not_exists':
          return fieldValue === undefined || fieldValue === null;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        case 'regex':
          return new RegExp(condition.value).test(String(fieldValue));
        default:
          this.logger.warn(`Unknown condition operator: ${condition.operator}`);
          return true;
      }
    });
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async getExecutionLogs(workflowId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;

    const [items, total] = await this.logRepository.findAndCount({
      where: { workflowId },
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const total = await this.workflowRepository.count();
    const enabled = await this.workflowRepository.count({ where: { enabled: true } });
    const disabled = total - enabled;

    const recentLogs = await this.logRepository
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('log.startedAt > :date', {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      })
      .groupBy('log.status')
      .getRawMany();

    const successCount = recentLogs.find((r) => r.status === 'success')?.count || 0;
    const failedCount = recentLogs.find((r) => r.status === 'failed')?.count || 0;

    return {
      total,
      enabled,
      disabled,
      last24h: {
        success: parseInt(successCount, 10),
        failed: parseInt(failedCount, 10),
      },
    };
  }
}
