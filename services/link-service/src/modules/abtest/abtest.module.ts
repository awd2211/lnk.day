import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { ABTest, ABTestEvent } from './abtest.entity';
import { ABTestService } from './abtest.service';
import { ABTestController } from './abtest.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ABTest, ABTestEvent]),
    ScheduleModule.forRoot(),
  ],
  controllers: [ABTestController],
  providers: [ABTestService],
  exports: [ABTestService],
})
export class ABTestModule {}
