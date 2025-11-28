import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { NotificationEventConsumer } from './notification-event.consumer';
import {
  RABBITMQ_CONNECTION,
  RABBITMQ_CHANNEL,
  NOTIFICATION_EVENTS_EXCHANGE,
  CAMPAIGN_EVENTS_EXCHANGE,
  NOTIFICATION_EMAIL_QUEUE,
  NOTIFICATION_SLACK_QUEUE,
  NOTIFICATION_WEBHOOK_QUEUE,
} from './rabbitmq.constants';

export { RABBITMQ_CONNECTION, RABBITMQ_CHANNEL };

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
            setTimeout(() => reject(new Error('Connection timeout')), timeout)
          );

          const connection = await Promise.race([connectionPromise, timeoutPromise]) as amqplib.Connection;
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

          // Declare exchanges
          await channel.assertExchange(NOTIFICATION_EVENTS_EXCHANGE, 'topic', { durable: true });
          await channel.assertExchange(CAMPAIGN_EVENTS_EXCHANGE, 'topic', { durable: true });

          // Declare notification queues
          await channel.assertQueue(NOTIFICATION_EMAIL_QUEUE, { durable: true });
          await channel.assertQueue(NOTIFICATION_SLACK_QUEUE, { durable: true });
          await channel.assertQueue(NOTIFICATION_WEBHOOK_QUEUE, { durable: true });

          // Bind queues to notification exchange
          await channel.bindQueue(NOTIFICATION_EMAIL_QUEUE, NOTIFICATION_EVENTS_EXCHANGE, 'notification.send.email');
          await channel.bindQueue(NOTIFICATION_SLACK_QUEUE, NOTIFICATION_EVENTS_EXCHANGE, 'notification.send.slack');
          await channel.bindQueue(NOTIFICATION_WEBHOOK_QUEUE, NOTIFICATION_EVENTS_EXCHANGE, 'notification.send.webhook');

          // Bind to campaign events (for goal notifications)
          await channel.bindQueue(NOTIFICATION_EMAIL_QUEUE, CAMPAIGN_EVENTS_EXCHANGE, 'campaign.goal.reached');
          await channel.bindQueue(NOTIFICATION_SLACK_QUEUE, CAMPAIGN_EVENTS_EXCHANGE, 'campaign.goal.reached');

          logger.log('RabbitMQ channel and exchanges configured');
          return channel;
        } catch (error: any) {
          logger.warn(`Failed to create RabbitMQ channel: ${error.message}`);
          return null;
        }
      },
      inject: [RABBITMQ_CONNECTION],
    },
    NotificationEventConsumer,
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL, NotificationEventConsumer],
})
export class RabbitMQModule {
  constructor(
    private readonly notificationEventConsumer: NotificationEventConsumer,
  ) {}

  async onModuleInit() {
    await this.notificationEventConsumer.startConsuming();
  }
}
