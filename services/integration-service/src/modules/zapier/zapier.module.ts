import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZapierService } from './zapier.service';
import { ZapierController } from './zapier.controller';
import { ZapierSubscription } from './entities/zapier-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZapierSubscription])],
  controllers: [ZapierController],
  providers: [ZapierService],
  exports: [ZapierService],
})
export class ZapierModule {}
