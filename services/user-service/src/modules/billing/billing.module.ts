import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillingController } from './billing.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { BillingService } from './billing.service';
import { Subscription, Invoice, PaymentMethod } from './entities/subscription.entity';
import { QuotaModule } from '../quota/quota.module';
import { PlanModule } from '../plan/plan.module';
import { StripeModule } from './stripe/stripe.module';
import { Team } from '../team/entities/team.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Invoice, PaymentMethod, Team, User]),
    forwardRef(() => QuotaModule),
    PlanModule,
    StripeModule,
  ],
  controllers: [BillingController, SubscriptionsController],
  providers: [BillingService],
  exports: [BillingService, StripeModule],
})
export class BillingModule {}
