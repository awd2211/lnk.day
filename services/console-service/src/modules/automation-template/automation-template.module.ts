import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationTemplate } from './entities/automation-template.entity';
import { AutomationTemplateService } from './automation-template.service';
import { AutomationTemplateController } from './automation-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AutomationTemplate])],
  controllers: [AutomationTemplateController],
  providers: [AutomationTemplateService],
  exports: [AutomationTemplateService],
})
export class AutomationTemplateModule {}
