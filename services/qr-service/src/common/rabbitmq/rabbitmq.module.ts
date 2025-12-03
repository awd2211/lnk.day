import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { QREventService } from './qr-event.service';
import {
  RABBITMQ_CONNECTION,
  RABBITMQ_CHANNEL,
  QR_EVENTS_EXCHANGE,
} from './rabbitmq.constants';

export { RABBITMQ_CONNECTION, RABBITMQ_CHANNEL, QR_EVENTS_EXCHANGE };

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

          await channel.assertExchange(QR_EVENTS_EXCHANGE, 'topic', {
            durable: true,
          });

          logger.log('RabbitMQ channel and exchanges configured');
          return channel;
        } catch (error: any) {
          logger.warn(`Failed to create RabbitMQ channel: ${error.message}`);
          return null;
        }
      },
      inject: [RABBITMQ_CONNECTION],
    },
    QREventService,
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL, QREventService],
})
export class RabbitMQModule {}
