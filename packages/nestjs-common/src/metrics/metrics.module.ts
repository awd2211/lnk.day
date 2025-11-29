import { Module, Global, DynamicModule } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

export interface MetricsModuleOptions {
  serviceName: string;
  defaultLabels?: Record<string, string>;
}

@Global()
@Module({})
export class MetricsModule {
  static forRoot(options: MetricsModuleOptions): DynamicModule {
    return {
      module: MetricsModule,
      providers: [
        {
          provide: 'METRICS_OPTIONS',
          useValue: options,
        },
        MetricsService,
        MetricsInterceptor,
      ],
      controllers: [MetricsController],
      exports: [MetricsService, MetricsInterceptor],
    };
  }
}
