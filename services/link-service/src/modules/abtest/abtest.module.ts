import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ABTest } from './abtest.entity';
import { ABTestService } from './abtest.service';
import { ABTestController } from './abtest.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ABTest])],
  controllers: [ABTestController],
  providers: [ABTestService],
  exports: [ABTestService],
})
export class ABTestModule {}
