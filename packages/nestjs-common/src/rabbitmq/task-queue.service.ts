import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { RabbitMQService } from './rabbitmq.service';

// 任务优先级
export enum TaskPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10,
}

// 任务状态
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  DEAD_LETTER = 'dead_letter',
}

// 任务定义
export interface Task<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: TaskPriority;
  status: TaskStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// 任务处理器
export type TaskHandler<T = any, R = any> = (
  payload: T,
  task: Task<T>,
) => Promise<R>;

// 任务选项
export interface TaskOptions {
  priority?: TaskPriority;
  delay?: number; // 延迟执行（毫秒）
  maxAttempts?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

// 任务队列配置
export interface TaskQueueConfig {
  name: string;
  concurrency?: number;
  maxRetries?: number;
  retryDelay?: number;
  enablePriority?: boolean;
  enableDelay?: boolean;
}

// 队列统计
export interface QueueStats {
  name: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  avgProcessingTime: number;
  throughput: number; // tasks per second
}

// 任务结果
export interface TaskResult<R = any> {
  taskId: string;
  status: TaskStatus;
  result?: R;
  error?: string;
  duration?: number;
}

@Injectable()
export class TaskQueueService implements OnModuleInit {
  private readonly logger = new Logger(TaskQueueService.name);
  private readonly handlers: Map<string, TaskHandler> = new Map();
  private readonly queues: Map<string, TaskQueueConfig> = new Map();
  private readonly taskStore: Map<string, Task> = new Map();
  private readonly stats: Map<string, {
    completed: number;
    failed: number;
    totalTime: number;
    startTime: number;
  }> = new Map();

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit() {
    // 初始化延迟队列基础设施
    await this.setupDelayedQueueInfrastructure();
  }

  // ==================== 队列管理 ====================

  /**
   * 注册任务队列
   */
  async registerQueue(config: TaskQueueConfig): Promise<void> {
    this.queues.set(config.name, config);

    const channel = this.rabbitMQService.getChannel();
    if (!channel) {
      this.logger.warn('RabbitMQ channel not available');
      return;
    }

    const queueArgs: Record<string, any> = {
      'x-dead-letter-exchange': 'dlx.tasks',
      'x-dead-letter-routing-key': `dlq.${config.name}`,
    };

    // 启用优先级队列
    if (config.enablePriority) {
      queueArgs['x-max-priority'] = 10;
    }

    await channel.assertQueue(config.name, {
      durable: true,
      arguments: queueArgs,
    });

    // 创建死信队列
    await channel.assertQueue(`dlq.${config.name}`, {
      durable: true,
      arguments: {
        'x-message-ttl': 7 * 24 * 60 * 60 * 1000, // 7 天
      },
    });

    // 初始化统计
    this.stats.set(config.name, {
      completed: 0,
      failed: 0,
      totalTime: 0,
      startTime: Date.now(),
    });

    this.logger.log(`Task queue registered: ${config.name}`);
  }

  /**
   * 注册任务处理器
   */
  registerHandler<T, R>(taskType: string, handler: TaskHandler<T, R>): void {
    this.handlers.set(taskType, handler as TaskHandler);
    this.logger.log(`Task handler registered: ${taskType}`);
  }

  // ==================== 任务操作 ====================

  /**
   * 添加任务到队列
   */
  async enqueue<T>(
    queueName: string,
    taskType: string,
    payload: T,
    options?: TaskOptions,
  ): Promise<string> {
    const task: Task<T> = {
      id: uuidv4(),
      type: taskType,
      payload,
      priority: options?.priority || TaskPriority.NORMAL,
      status: TaskStatus.PENDING,
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      metadata: options?.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 处理延迟任务
    if (options?.delay && options.delay > 0) {
      task.scheduledAt = new Date(Date.now() + options.delay);
      await this.scheduleDelayedTask(queueName, task, options.delay);
    } else {
      await this.publishTask(queueName, task);
    }

    this.taskStore.set(task.id, task);
    return task.id;
  }

  /**
   * 批量添加任务
   */
  async enqueueBatch<T>(
    queueName: string,
    tasks: Array<{
      type: string;
      payload: T;
      options?: TaskOptions;
    }>,
  ): Promise<string[]> {
    const taskIds: string[] = [];

    for (const taskDef of tasks) {
      const taskId = await this.enqueue(
        queueName,
        taskDef.type,
        taskDef.payload,
        taskDef.options,
      );
      taskIds.push(taskId);
    }

    return taskIds;
  }

  /**
   * 启动队列消费
   */
  async startConsumer(queueName: string): Promise<void> {
    const config = this.queues.get(queueName);
    if (!config) {
      throw new Error(`Queue not registered: ${queueName}`);
    }

    const channel = this.rabbitMQService.getChannel();
    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }

    await channel.prefetch(config.concurrency || 10);

    await channel.consume(queueName, async (msg) => {
      if (!msg) return;

      const startTime = Date.now();
      let task: Task;

      try {
        task = JSON.parse(msg.content.toString());
        task.status = TaskStatus.PROCESSING;
        task.startedAt = new Date();
        task.attempts++;
        task.updatedAt = new Date();

        this.taskStore.set(task.id, task);

        // 获取处理器
        const handler = this.handlers.get(task.type);
        if (!handler) {
          throw new Error(`No handler registered for task type: ${task.type}`);
        }

        // 执行任务
        const result = await handler(task.payload, task);

        // 更新任务状态
        task.status = TaskStatus.COMPLETED;
        task.completedAt = new Date();
        task.updatedAt = new Date();
        this.taskStore.set(task.id, task);

        // 更新统计
        this.updateStats(queueName, true, Date.now() - startTime);

        channel.ack(msg);
        this.logger.debug(`Task completed: ${task.id} (${task.type})`);
      } catch (error: any) {
        task = JSON.parse(msg.content.toString());
        task.error = error.message;
        task.updatedAt = new Date();

        if (task.attempts < task.maxAttempts) {
          // 重试
          task.status = TaskStatus.RETRYING;
          this.taskStore.set(task.id, task);

          const retryDelay = this.calculateRetryDelay(task.attempts, config.retryDelay);
          await this.scheduleDelayedTask(queueName, task, retryDelay);

          this.logger.warn(
            `Task failed, scheduling retry ${task.attempts}/${task.maxAttempts}: ${task.id}`,
          );
        } else {
          // 进入死信队列
          task.status = TaskStatus.DEAD_LETTER;
          this.taskStore.set(task.id, task);

          this.updateStats(queueName, false, Date.now() - startTime);
          this.logger.error(`Task failed permanently: ${task.id} - ${error.message}`);
        }

        channel.ack(msg);
      }
    });

    this.logger.log(`Consumer started for queue: ${queueName}`);
  }

  // ==================== 延迟任务 ====================

  private async setupDelayedQueueInfrastructure(): Promise<void> {
    const channel = this.rabbitMQService.getChannel();
    if (!channel) return;

    try {
      // 创建延迟交换机（使用 x-delayed-message 插件或模拟）
      await channel.assertExchange('delayed.tasks', 'direct', {
        durable: true,
      });

      // 创建延迟队列（使用 TTL + DLX 模拟延迟）
      await channel.assertQueue('delayed.tasks.holding', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-message-ttl': 0, // 将在发布时设置
        },
      });

      this.logger.log('Delayed task infrastructure initialized');
    } catch (error: any) {
      this.logger.error(`Failed to setup delayed queue: ${error.message}`);
    }
  }

  private async scheduleDelayedTask(
    queueName: string,
    task: Task,
    delay: number,
  ): Promise<void> {
    const channel = this.rabbitMQService.getChannel();
    if (!channel) return;

    // 创建一个临时延迟队列
    const delayQueueName = `delay.${delay}.${queueName}`;

    await channel.assertQueue(delayQueueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': queueName,
        'x-message-ttl': delay,
        'x-expires': delay + 60000, // 队列在延迟后1分钟自动删除
      },
    });

    channel.sendToQueue(delayQueueName, Buffer.from(JSON.stringify(task)), {
      persistent: true,
      priority: task.priority,
    });
  }

  private async publishTask(queueName: string, task: Task): Promise<void> {
    const channel = this.rabbitMQService.getChannel();
    if (!channel) return;

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(task)), {
      persistent: true,
      priority: task.priority,
      messageId: task.id,
    });
  }

  // ==================== 任务查询 ====================

  /**
   * 获取任务状态
   */
  getTask(taskId: string): Task | null {
    return this.taskStore.get(taskId) || null;
  }

  /**
   * 获取任务结果
   */
  async waitForTask<R>(
    taskId: string,
    timeout: number = 30000,
  ): Promise<TaskResult<R>> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const task = this.taskStore.get(taskId);

      if (task) {
        if (task.status === TaskStatus.COMPLETED) {
          return {
            taskId,
            status: task.status,
            duration: task.completedAt
              ? task.completedAt.getTime() - task.createdAt.getTime()
              : undefined,
          };
        }

        if (task.status === TaskStatus.FAILED || task.status === TaskStatus.DEAD_LETTER) {
          return {
            taskId,
            status: task.status,
            error: task.error,
          };
        }
      }

      await this.sleep(100);
    }

    return {
      taskId,
      status: TaskStatus.PENDING,
      error: 'Timeout waiting for task completion',
    };
  }

  // ==================== 统计和监控 ====================

  /**
   * 获取队列统计
   */
  async getQueueStats(queueName: string): Promise<QueueStats | null> {
    const channel = this.rabbitMQService.getChannel();
    if (!channel) return null;

    const stats = this.stats.get(queueName);
    if (!stats) return null;

    try {
      const queueInfo = await channel.checkQueue(queueName);
      const dlqInfo = await channel.checkQueue(`dlq.${queueName}`);

      const elapsed = (Date.now() - stats.startTime) / 1000;
      const throughput = elapsed > 0 ? (stats.completed + stats.failed) / elapsed : 0;
      const avgProcessingTime =
        stats.completed > 0 ? stats.totalTime / stats.completed : 0;

      return {
        name: queueName,
        pending: queueInfo.messageCount,
        processing: queueInfo.consumerCount,
        completed: stats.completed,
        failed: stats.failed,
        deadLetter: dlqInfo.messageCount,
        avgProcessingTime,
        throughput,
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取所有队列统计
   */
  async getAllStats(): Promise<QueueStats[]> {
    const results: QueueStats[] = [];

    for (const queueName of this.queues.keys()) {
      const stats = await this.getQueueStats(queueName);
      if (stats) {
        results.push(stats);
      }
    }

    return results;
  }

  private updateStats(queueName: string, success: boolean, duration: number): void {
    const stats = this.stats.get(queueName);
    if (!stats) return;

    if (success) {
      stats.completed++;
      stats.totalTime += duration;
    } else {
      stats.failed++;
    }
  }

  // ==================== 重试管理 ====================

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(attempt: number, baseDelay?: number): number {
    const base = baseDelay || 5000;
    const maxDelay = 300000; // 5 minutes
    const delay = base * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * 重试死信队列中的任务
   */
  async retryDeadLetter(queueName: string, taskId?: string): Promise<number> {
    const channel = this.rabbitMQService.getChannel();
    if (!channel) return 0;

    const dlqName = `dlq.${queueName}`;
    let retried = 0;

    try {
      const queueInfo = await channel.checkQueue(dlqName);
      const messageCount = queueInfo.messageCount;

      for (let i = 0; i < messageCount; i++) {
        const msg = await channel.get(dlqName);
        if (!msg) break;

        const task: Task = JSON.parse(msg.content.toString());

        if (taskId && task.id !== taskId) {
          // 不匹配，放回队列
          channel.nack(msg, false, true);
          continue;
        }

        // 重置任务状态
        task.status = TaskStatus.PENDING;
        task.attempts = 0;
        task.error = undefined;
        task.updatedAt = new Date();

        // 重新发布到主队列
        await this.publishTask(queueName, task);
        channel.ack(msg);
        retried++;

        if (taskId) break; // 只重试指定任务
      }
    } catch (error: any) {
      this.logger.error(`Failed to retry dead letter: ${error.message}`);
    }

    return retried;
  }

  /**
   * 清理死信队列
   */
  async purgeDeadLetter(queueName: string): Promise<number> {
    const channel = this.rabbitMQService.getChannel();
    if (!channel) return 0;

    try {
      const result = await channel.purgeQueue(`dlq.${queueName}`);
      return result.messageCount;
    } catch {
      return 0;
    }
  }

  // ==================== 辅助方法 ====================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
