import { Module, DynamicModule } from '@nestjs/common';
import { SagaOrchestrator } from './saga.orchestrator';
import { InMemorySagaStore, ISagaStore, SAGA_STORE } from './saga.store';

export interface SagaModuleOptions {
  /**
   * 自定义 Saga 存储实现
   * 默认使用内存存储
   */
  store?: ISagaStore;
  /**
   * 是否设置为全局模块
   * 默认为 false，避免与 ScheduleModule 等其他模块冲突
   */
  isGlobal?: boolean;
}

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
      global: options?.isGlobal ?? false,
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
    isGlobal?: boolean;
  }): DynamicModule {
    return {
      module: SagaModule,
      global: options.isGlobal ?? false,
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
