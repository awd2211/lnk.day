import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationWorkflow } from './entities/automation-workflow.entity';
import { AutomationExecutionLog } from './entities/automation-execution-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationWorkflow, AutomationExecutionLog]),
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
