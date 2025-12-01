import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { AutomationWorkflow, TriggerType } from './entities/automation-workflow.entity';
import { AutomationExecutionLog } from './entities/automation-execution-log.entity';
import { CreateAutomationWorkflowDto } from './dto/create-automation-workflow.dto';
import { UpdateAutomationWorkflowDto } from './dto/update-automation-workflow.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationWorkflow)
    private readonly workflowRepository: Repository<AutomationWorkflow>,
    @InjectRepository(AutomationExecutionLog)
    private readonly logRepository: Repository<AutomationExecutionLog>,
  ) {}

  async findAll(params: {
    search?: string;
    trigger?: TriggerType;
    status?: 'enabled' | 'disabled';
    page?: number;
    limit?: number;
  }) {
    const { search, trigger, status, page = 1, limit = 20 } = params;

    const where: FindOptionsWhere<AutomationWorkflow> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (status === 'enabled') {
      where.enabled = true;
    } else if (status === 'disabled') {
      where.enabled = false;
    }

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

  async execute(id: string, inputData?: Record<string, any>): Promise<AutomationExecutionLog> {
    const workflow = await this.findOne(id);

    const log = this.logRepository.create({
      workflowId: id,
      status: 'running',
      inputData,
    });
    await this.logRepository.save(log);

    try {
      // Simulate workflow execution
      this.logger.log(`Executing workflow ${workflow.name}`);

      // TODO: Implement actual workflow execution logic
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 100));

      log.status = 'success';
      log.completedAt = new Date();
      log.outputData = { message: 'Workflow executed successfully' };

      // Update workflow stats
      workflow.executionCount += 1;
      workflow.lastExecuted = new Date();
      workflow.lastStatus = 'success';
      await this.workflowRepository.save(workflow);

    } catch (error: any) {
      log.status = 'failed';
      log.completedAt = new Date();
      log.error = error?.message || 'Unknown error';

      // Update workflow stats
      workflow.executionCount += 1;
      workflow.lastExecuted = new Date();
      workflow.lastStatus = 'failed';
      await this.workflowRepository.save(workflow);
    }

    return this.logRepository.save(log);
  }

  async getExecutionLogs(
    workflowId: string,
    params: { page?: number; limit?: number },
  ) {
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
