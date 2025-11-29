import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { TimeoutInterceptor } from './timeout.interceptor';

@Global()
@Module({
  providers: [
    Reflector,
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
  exports: [Reflector],
})
export class TimeoutModule {}
