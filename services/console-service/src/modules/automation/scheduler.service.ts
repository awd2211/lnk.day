import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AutomationService } from './automation.service';
import { AutomationWorkflow } from './entities/automation-workflow.entity';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private scheduledJobs: Map<string, CronJob> = new Map();
  private isInitialized = false;

  constructor(
    private readonly automationService: AutomationService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    // 延迟初始化，确保数据库连接就绪
    setTimeout(() => this.initializeScheduledWorkflows(), 5000);
  }

  onModuleDestroy() {
    // 清理所有定时任务
    this.scheduledJobs.forEach((job, id) => {
      try {
        job.stop();
        this.logger.debug(`Stopped scheduled job: ${id}`);
      } catch (error) {
        // Ignore
      }
    });
    this.scheduledJobs.clear();
  }

  /**
   * 初始化所有定时任务工作流
   */
  private async initializeScheduledWorkflows() {
    if (this.isInitialized) return;

    try {
      const workflows = await this.automationService.findScheduledWorkflows();
      this.logger.log(`Found ${workflows.length} scheduled workflow(s)`);

      for (const workflow of workflows) {
        await this.scheduleWorkflow(workflow);
      }

      this.isInitialized = true;
    } catch (error: any) {
      this.logger.error(`Failed to initialize scheduled workflows: ${error.message}`);
    }
  }

  /**
   * 为单个工作流创建定时任务
   */
  async scheduleWorkflow(workflow: AutomationWorkflow): Promise<void> {
    const cronExpression = workflow.trigger.config?.cronExpression;

    if (!cronExpression) {
      this.logger.warn(`Workflow "${workflow.name}" has no cron expression, skipping`);
      return;
    }

    // 如果已存在，先移除
    await this.unscheduleWorkflow(workflow.id);

    try {
      const job = new CronJob(
        cronExpression,
        async () => {
          this.logger.log(`Executing scheduled workflow: ${workflow.name}`);
          try {
            await this.automationService.executeScheduled(workflow.id);
          } catch (error: any) {
            this.logger.error(`Scheduled execution failed for "${workflow.name}": ${error.message}`);
          }
        },
        null, // onComplete
        true, // start
        'Asia/Shanghai', // timezone
      );

      this.scheduledJobs.set(workflow.id, job);
      this.schedulerRegistry.addCronJob(`automation_${workflow.id}`, job);

      this.logger.log(
        `Scheduled workflow "${workflow.name}" with cron: ${cronExpression} ` +
          `(next run: ${job.nextDate().toJSDate().toISOString()})`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to schedule workflow "${workflow.name}": ${error.message}`);
    }
  }

  /**
   * 移除工作流的定时任务
   */
  async unscheduleWorkflow(workflowId: string): Promise<void> {
    const existingJob = this.scheduledJobs.get(workflowId);
    if (existingJob) {
      try {
        existingJob.stop();
        this.schedulerRegistry.deleteCronJob(`automation_${workflowId}`);
      } catch (error) {
        // Job may not exist in registry
      }
      this.scheduledJobs.delete(workflowId);
      this.logger.debug(`Unscheduled workflow: ${workflowId}`);
    }
  }

  /**
   * 重新加载工作流定时任务（启用/禁用/更新时调用）
   */
  async reloadWorkflow(workflowId: string): Promise<void> {
    try {
      const workflow = await this.automationService.findOne(workflowId);

      if (workflow.enabled && workflow.trigger.type === 'schedule') {
        await this.scheduleWorkflow(workflow);
      } else {
        await this.unscheduleWorkflow(workflowId);
      }
    } catch (error: any) {
      this.logger.error(`Failed to reload workflow ${workflowId}: ${error.message}`);
    }
  }

  /**
   * 每 5 分钟检查并同步定时任务
   * 处理可能的数据不一致（如数据库直接修改）
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncScheduledWorkflows() {
    if (!this.isInitialized) return;

    try {
      const workflows = await this.automationService.findScheduledWorkflows();
      const currentWorkflowIds = new Set(workflows.map((w) => w.id));

      // 移除已删除或禁用的任务
      for (const [id] of this.scheduledJobs) {
        if (!currentWorkflowIds.has(id)) {
          await this.unscheduleWorkflow(id);
        }
      }

      // 添加新的任务
      for (const workflow of workflows) {
        if (!this.scheduledJobs.has(workflow.id)) {
          await this.scheduleWorkflow(workflow);
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to sync scheduled workflows: ${error.message}`);
    }
  }

  /**
   * 获取所有定时任务状态
   */
  getScheduledJobsStatus(): { id: string; running: boolean; lastRun?: Date; nextRun?: Date }[] {
    const status: { id: string; running: boolean; lastRun?: Date; nextRun?: Date }[] = [];

    this.scheduledJobs.forEach((job, id) => {
      status.push({
        id,
        running: job.running,
        lastRun: job.lastDate() ? new Date(job.lastDate()!) : undefined,
        nextRun: job.nextDate() ? job.nextDate().toJSDate() : undefined,
      });
    });

    return status;
  }
}
