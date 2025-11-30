import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Reflector, DiscoveryModule } from '@nestjs/core';

/**
 * 封装 ScheduleModule 以解决 Reflector 依赖问题
 * ScheduleModule 内部的 SchedulerMetadataAccessor 需要 Reflector,
 * 但当存在其他 @Global 模块时，Reflector 可能无法正确注入。
 * 这个封装模块确保 Reflector 在正确的上下文中可用。
 */
@Global()
@Module({
  imports: [
    DiscoveryModule,
    ScheduleModule.forRoot(),
  ],
  providers: [Reflector],
  exports: [ScheduleModule, Reflector],
})
export class ScheduleWrapperModule {}
