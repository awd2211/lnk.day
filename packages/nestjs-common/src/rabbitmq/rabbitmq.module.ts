import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQConfig } from './rabbitmq.types';

export interface RabbitMQModuleOptions {
  url?: string;
  connectionTimeout?: number;
  heartbeat?: number;
}

@Global()
@Module({})
export class RabbitMQModule {
  /**
   * 注册 RabbitMQ 模块
   */
  static forRoot(options?: RabbitMQModuleOptions): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'RABBITMQ_OPTIONS',
          useValue: options || {},
        },
        RabbitMQService,
      ],
      exports: [RabbitMQService],
    };
  }

  /**
   * 异步注册 RabbitMQ 模块
   */
  static forRootAsync(): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'RABBITMQ_OPTIONS',
          useFactory: (configService: ConfigService): RabbitMQModuleOptions => ({
            url: configService.get('RABBITMQ_URL', 'amqp://rabbit:rabbit123@localhost:60036'),
            connectionTimeout: configService.get('RABBITMQ_CONNECTION_TIMEOUT', 5000),
            heartbeat: configService.get('RABBITMQ_HEARTBEAT', 60),
          }),
          inject: [ConfigService],
        },
        RabbitMQService,
      ],
      exports: [RabbitMQService],
    };
  }
}
