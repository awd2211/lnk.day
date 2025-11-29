import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { RABBITMQ_CONNECTION, RABBITMQ_CHANNEL } from './rabbitmq.constants';
import { WebhookEventConsumer } from './webhook-event.consumer';
import { EXCHANGES } from '@lnk/shared-types';

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

          return connection;
        } catch (error: any) {
          logger.warn(`Failed to connect to RabbitMQ: ${error.message}`);
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
          logger.warn('RabbitMQ connection not available');
          return null;
        }

        try {
          const channel = await connection.createChannel();

          // 声明死信交换机
          await channel.assertExchange(EXCHANGES.DEAD_LETTER, 'topic', { durable: true });

          logger.log('RabbitMQ channel configured');
          return channel;
        } catch (error: any) {
          logger.warn(`Failed to create channel: ${error.message}`);
          return null;
        }
      },
      inject: [RABBITMQ_CONNECTION],
    },
    WebhookEventConsumer,
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL, WebhookEventConsumer],
})
export class RabbitMQModule {}
