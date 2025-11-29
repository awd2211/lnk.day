import { Module, Global, DynamicModule } from '@nestjs/common';
import { SagaOrchestrator } from './saga.orchestrator';
import { InMemorySagaStore, ISagaStore, SAGA_STORE } from './saga.store';

export interface SagaModuleOptions {
  /**
   * 自定义 Saga 存储实现
   * 默认使用内存存储
   */
  store?: ISagaStore;
}

@Global()
@Module({})
export class SagaModule {
  /**
   * 注册 Saga 模块
   */
  static forRoot(options?: SagaModuleOptions): DynamicModule {
    const storeProvider = options?.store
      ? {
          provide: SAGA_STORE,
          useValue: options.store,
        }
      : {
          provide: SAGA_STORE,
          useClass: InMemorySagaStore,
        };

    return {
      module: SagaModule,
      providers: [storeProvider, SagaOrchestrator],
      exports: [SagaOrchestrator, SAGA_STORE],
    };
  }

  /**
   * 异步注册 Saga 模块
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<SagaModuleOptions> | SagaModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: SagaModule,
      providers: [
        {
          provide: SAGA_STORE,
          useFactory: async (...args: any[]) => {
            const opts = await options.useFactory(...args);
            return opts.store || new InMemorySagaStore();
          },
          inject: options.inject || [],
        },
        SagaOrchestrator,
      ],
      exports: [SagaOrchestrator, SAGA_STORE],
    };
  }
}
