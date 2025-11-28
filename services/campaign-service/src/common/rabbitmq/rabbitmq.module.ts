import { Module, Global, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { CampaignEventService } from './campaign-event.service';
import { LinkEventConsumer } from './link-event.consumer';
import {
  RABBITMQ_CONNECTION,
  RABBITMQ_CHANNEL,
  LINK_EVENTS_EXCHANGE,
  CAMPAIGN_EVENTS_EXCHANGE,
  CAMPAIGN_LINK_EVENTS_QUEUE,
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
          await channel.assertExchange(LINK_EVENTS_EXCHANGE, 'topic', { durable: true });
          await channel.assertExchange(CAMPAIGN_EVENTS_EXCHANGE, 'topic', { durable: true });

          // Declare queue for consuming link events
          await channel.assertQueue(CAMPAIGN_LINK_EVENTS_QUEUE, { durable: true });

          // Bind queue to link events
          await channel.bindQueue(CAMPAIGN_LINK_EVENTS_QUEUE, LINK_EVENTS_EXCHANGE, 'link.created');
          await channel.bindQueue(CAMPAIGN_LINK_EVENTS_QUEUE, LINK_EVENTS_EXCHANGE, 'link.updated');
          await channel.bindQueue(CAMPAIGN_LINK_EVENTS_QUEUE, LINK_EVENTS_EXCHANGE, 'link.deleted');

          logger.log('RabbitMQ channel and exchanges configured');
          return channel;
        } catch (error: any) {
          logger.warn(`Failed to create RabbitMQ channel: ${error.message}`);
          return null;
        }
      },
      inject: [RABBITMQ_CONNECTION],
    },
    CampaignEventService,
    LinkEventConsumer,
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL, CampaignEventService, LinkEventConsumer],
})
export class RabbitMQModule implements OnModuleDestroy {
  constructor(
    private readonly linkEventConsumer: LinkEventConsumer,
  ) {}

  async onModuleInit() {
    // Start consuming link events
    await this.linkEventConsumer.startConsuming();
  }

  async onModuleDestroy() {
    // Cleanup will be handled by connection close
  }
}
