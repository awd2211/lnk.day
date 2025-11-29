import { Module, Global, DynamicModule, OnModuleDestroy } from '@nestjs/common';
import { TracingService } from './tracing.service';

export interface TracingModuleOptions {
  serviceName: string;
  jaegerEndpoint?: string;
  sampleRate?: number;
}

@Global()
@Module({})
export class TracingModule implements OnModuleDestroy {
  private static tracingService: TracingService;

  static forRoot(options: TracingModuleOptions): DynamicModule {
    return {
      module: TracingModule,
      providers: [
        {
          provide: 'TRACING_OPTIONS',
          useValue: options,
        },
        TracingService,
      ],
      exports: [TracingService],
    };
  }

  constructor(private readonly tracingService: TracingService) {
    TracingModule.tracingService = tracingService;
  }

  async onModuleDestroy() {
    if (TracingModule.tracingService) {
      await TracingModule.tracingService.shutdown();
    }
  }
}
