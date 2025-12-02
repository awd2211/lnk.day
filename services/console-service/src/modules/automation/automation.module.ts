import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { ActionExecutorService } from './action-executor.service';
import { EventListenerService } from './event-listener.service';
import { SchedulerService } from './scheduler.service';
import { AutomationWorkflow } from './entities/automation-workflow.entity';
import { AutomationExecutionLog } from './entities/automation-execution-log.entity';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AutomationWorkflow, AutomationExecutionLog]),
  ],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    ActionExecutorService,
    EventListenerService,
    SchedulerService,
  ],
  exports: [AutomationService, SchedulerService],
})
export class AutomationModule {}
