import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { RABBITMQ_CHANNEL, AUTOMATION_QUEUE } from '../../common/rabbitmq/rabbitmq.module';
import { AutomationService } from './automation.service';

interface EventMessage {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  data: Record<string, any>;
}

@Injectable()
export class EventListenerService implements OnModuleInit {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
    private readonly automationService: AutomationService,
  ) {}

  async onModuleInit() {
    await this.startListening();
  }

  async startListening() {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available - event listening disabled');
      return;
    }

    try {
      // 设置预取数量，避免一次处理太多消息
      await this.channel.prefetch(10);

      this.channel.consume(
        AUTOMATION_QUEUE,
        async (msg) => {
          if (!msg) return;

          try {
            const event: EventMessage = JSON.parse(msg.content.toString());
            this.logger.debug(`Received event: ${event.type} [${event.id}]`);

            await this.processEvent(event);

            // 确认消息已处理
            this.channel!.ack(msg);
          } catch (error: any) {
            this.logger.error(`Failed to process event: ${error.message}`);
            // 拒绝消息但不重新入队（避免无限循环）
            this.channel!.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.logger.log('Event listener started - listening for automation triggers');
    } catch (error: any) {
      this.logger.error(`Failed to start event listener: ${error.message}`);
    }
  }

  private async processEvent(event: EventMessage) {
    // 查找匹配此事件的所有启用的工作流
    const workflows = await this.automationService.findWorkflowsByEvent(event.type);

    if (workflows.length === 0) {
      this.logger.debug(`No workflows found for event: ${event.type}`);
      return;
    }

    this.logger.log(`Found ${workflows.length} workflow(s) for event: ${event.type}`);

    // 并行执行所有匹配的工作流
    const results = await Promise.allSettled(
      workflows.map((workflow) =>
        this.automationService.executeWithEvent(workflow.id, event.type, event.data),
      ),
    );

    // 记录执行结果
    results.forEach((result, index) => {
      const workflow = workflows[index];
      if (!workflow) return;
      if (result.status === 'fulfilled') {
        this.logger.log(`Workflow "${workflow.name}" executed successfully for event ${event.type}`);
      } else {
        this.logger.error(`Workflow "${workflow.name}" failed: ${result.reason}`);
      }
    });
  }
}
