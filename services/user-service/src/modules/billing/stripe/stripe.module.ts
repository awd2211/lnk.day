import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { Subscription, Invoice, PaymentMethod } from '../entities/subscription.entity';
import { QuotaModule } from '../../quota/quota.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Invoice, PaymentMethod]),
    forwardRef(() => QuotaModule),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
