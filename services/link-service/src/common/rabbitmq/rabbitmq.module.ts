import { Module, Global, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { LinkEventService } from './link-event.service';

export const RABBITMQ_CONNECTION = 'RABBITMQ_CONNECTION';
export const RABBITMQ_CHANNEL = 'RABBITMQ_CHANNEL';

// Exchange and queue names
export const LINK_EVENTS_EXCHANGE = 'link.events';
export const LINK_CACHE_INVALIDATION_QUEUE = 'link.cache.invalidation';

@Global()
@Module({
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RabbitMQModule');
        const url = configService.get('RABBITMQ_URL', 'amqp://rabbit:rabbit123@localhost:60036');

        try {
          const connection = await amqplib.connect(url);
          logger.log('RabbitMQ connected');

          connection.on('error', (err) => {
            logger.error(`RabbitMQ connection error: ${err.message}`);
          });

          connection.on('close', () => {
            logger.warn('RabbitMQ connection closed');
          });

          return connection;
        } catch (error: any) {
          logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
          throw error;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: RABBITMQ_CHANNEL,
      useFactory: async (connection: any) => {
        const logger = new Logger('RabbitMQModule');

        try {
          const channel = await connection.createChannel();

          // Declare exchange for link events
          await channel.assertExchange(LINK_EVENTS_EXCHANGE, 'topic', {
            durable: true,
          });

          // Declare queue for cache invalidation
          await channel.assertQueue(LINK_CACHE_INVALIDATION_QUEUE, {
            durable: true,
          });

          // Bind queue to exchange with routing keys
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
          logger.error(`Failed to create RabbitMQ channel: ${error.message}`);
          throw error;
        }
      },
      inject: [RABBITMQ_CONNECTION],
    },
    LinkEventService,
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL, LinkEventService],
})
export class RabbitMQModule {}
