import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// ScheduleModule.forRoot() 只需在根模块 (AppModule) 中调用一次

import { ABTest, ABTestEvent } from './abtest.entity';
import { ABTestService } from './abtest.service';
import { ABTestController } from './abtest.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ABTest, ABTestEvent]),
  ],
  controllers: [ABTestController],
  providers: [ABTestService],
  exports: [ABTestService],
})
export class ABTestModule {}
