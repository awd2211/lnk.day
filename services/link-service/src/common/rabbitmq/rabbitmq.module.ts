import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { LinkEventService } from './link-event.service';
import {
  RABBITMQ_CONNECTION,
  RABBITMQ_CHANNEL,
  LINK_EVENTS_EXCHANGE,
  LINK_CACHE_INVALIDATION_QUEUE,
} from './rabbitmq.constants';

export { RABBITMQ_CONNECTION, RABBITMQ_CHANNEL, LINK_EVENTS_EXCHANGE, LINK_CACHE_INVALIDATION_QUEUE };

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RabbitMQModule');
        const url = configService.get('RABBITMQ_URL', 'amqp://rabbit:rabbit123@localhost:60036');
        const timeout = 5000; // 5 second timeout

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

          await channel.assertExchange(LINK_EVENTS_EXCHANGE, 'topic', {
            durable: true,
          });

          await channel.assertQueue(LINK_CACHE_INVALIDATION_QUEUE, {
            durable: true,
          });

          await channel.bindQueue(
            LINK_CACHE_INVALIDATION_QUEUE,
            LINK_EVENTS_EXCHANGE,
            'link.created',
          );
          await channel.bindQueue(
            LINK_CACHE_INVALIDATION_QUEUE,
            LINK_EVENTS_EXCHANGE,
            'link.updated',
          );
          await channel.bindQueue(
            LINK_CACHE_INVALIDATION_QUEUE,
            LINK_EVENTS_EXCHANGE,
            'link.deleted',
          );

          logger.log('RabbitMQ channel and exchanges configured');
          return channel;
        } catch (error: any) {
          logger.warn(`Failed to create RabbitMQ channel: ${error.message}`);
          return null;
        }
      },
      inject: [RABBITMQ_CONNECTION],
    },
    LinkEventService,
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL, LinkEventService],
})
export class RabbitMQModule {}
