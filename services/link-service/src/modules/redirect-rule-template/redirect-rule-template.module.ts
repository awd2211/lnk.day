import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedirectRuleTemplate } from './entities/redirect-rule-template.entity';
import { RedirectRuleTemplateService } from './redirect-rule-template.service';
import { RedirectRuleTemplateController } from './redirect-rule-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RedirectRuleTemplate])],
  controllers: [RedirectRuleTemplateController],
  providers: [RedirectRuleTemplateService],
  exports: [RedirectRuleTemplateService],
})
export class RedirectRuleTemplateModule {}
