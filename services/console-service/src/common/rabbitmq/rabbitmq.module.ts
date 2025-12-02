import { Module, Global, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import {
  RABBITMQ_CONNECTION,
  RABBITMQ_CHANNEL,
  LINK_EVENTS_EXCHANGE,
  USER_EVENTS_EXCHANGE,
  CLICK_EVENTS_EXCHANGE,
  AUTOMATION_QUEUE,
  EVENT_TYPES,
} from './rabbitmq.constants';

export {
  RABBITMQ_CONNECTION,
  RABBITMQ_CHANNEL,
  AUTOMATION_QUEUE,
  EVENT_TYPES,
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RabbitMQModule');
        const url = configService.get('RABBITMQ_URL', 'amqp://rabbit:rabbit123@localhost:60036');
        const timeout = 5000;

        try {
          const connectionPromise = amqplib.connect(url);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), timeout),
          );

          const connection = (await Promise.race([connectionPromise, timeoutPromise])) as amqplib.Connection;
          logger.log('RabbitMQ connected');

          connection.on('error', (err) => {
            logger.error(`RabbitMQ connection error: ${err.message}`);
          });

          connection.on('close', () => {
            logger.warn('RabbitMQ connection closed');
          });

          return connection;
        } catch (error: any) {
          logger.warn(`Failed to connect to RabbitMQ: ${error.message}. Service will continue without messaging.`);
          return null;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: RABBITMQ_CHANNEL,
      useFactory: async (connection: any) => {
        const logger = new Logger('RabbitMQModule');

        if (!connection) {
          logger.warn('RabbitMQ connection not available, skipping channel creation');
          return null;
        }

        try {
          const channel = await connection.createChannel();

          // 声明交换机
          await channel.assertExchange(LINK_EVENTS_EXCHANGE, 'topic', { durable: true });
          await channel.assertExchange(USER_EVENTS_EXCHANGE, 'topic', { durable: true });
          await channel.assertExchange(CLICK_EVENTS_EXCHANGE, 'topic', { durable: true });

          // 声明自动化队列
          await channel.assertQueue(AUTOMATION_QUEUE, {
            durable: true,
            arguments: {
              'x-message-ttl': 86400000, // 24 hours TTL
            },
          });

          // 绑定 Link 事件
          await channel.bindQueue(AUTOMATION_QUEUE, LINK_EVENTS_EXCHANGE, 'link.created');
          await channel.bindQueue(AUTOMATION_QUEUE, LINK_EVENTS_EXCHANGE, 'link.updated');
          await channel.bindQueue(AUTOMATION_QUEUE, LINK_EVENTS_EXCHANGE, 'link.deleted');
          await channel.bindQueue(AUTOMATION_QUEUE, LINK_EVENTS_EXCHANGE, 'link.threshold');

          // 绑定 User 事件
          await channel.bindQueue(AUTOMATION_QUEUE, USER_EVENTS_EXCHANGE, 'user.registered');
          await channel.bindQueue(AUTOMATION_QUEUE, USER_EVENTS_EXCHANGE, 'user.upgraded');
          await channel.bindQueue(AUTOMATION_QUEUE, USER_EVENTS_EXCHANGE, 'team.created');

          // 绑定 Click 事件 (高频，谨慎使用)
          await channel.bindQueue(AUTOMATION_QUEUE, CLICK_EVENTS_EXCHANGE, 'link.clicked');

          // 绑定配额和安全事件
          await channel.bindQueue(AUTOMATION_QUEUE, USER_EVENTS_EXCHANGE, 'quota.warning');
          await channel.bindQueue(AUTOMATION_QUEUE, USER_EVENTS_EXCHANGE, 'quota.exceeded');
          await channel.bindQueue(AUTOMATION_QUEUE, LINK_EVENTS_EXCHANGE, 'security.threat');

          logger.log('RabbitMQ channel and automation queue configured');
          return channel;
        } catch (error: any) {
          logger.warn(`Failed to create RabbitMQ channel: ${error.message}`);
          return null;
        }
      },
      inject: [RABBITMQ_CONNECTION],
    },
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL],
})
export class RabbitMQModule implements OnModuleDestroy {
  private connection: amqplib.Connection | null = null;

  constructor() {}

  setConnection(conn: amqplib.Connection | null) {
    this.connection = conn;
  }

  async onModuleDestroy() {
    if (this.connection) {
      try {
        await (this.connection as any).close();
      } catch (error) {
        // Ignore close errors
      }
    }
  }
}
