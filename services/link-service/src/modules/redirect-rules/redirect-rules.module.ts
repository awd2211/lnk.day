import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedirectRule, RedirectRuleGroup } from './entities/redirect-rule.entity';
import { RedirectRulesService } from './redirect-rules.service';
import {
  RedirectRulesController,
  InternalRedirectRulesController,
} from './redirect-rules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RedirectRule, RedirectRuleGroup])],
  controllers: [RedirectRulesController, InternalRedirectRulesController],
  providers: [RedirectRulesService],
  exports: [RedirectRulesService],
})
export class RedirectRulesModule {}
