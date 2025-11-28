import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CampaignGoal, GoalNotification } from './entities/campaign-goal.entity';
import { GoalsService } from './goals.service';
import { GoalsController, GoalsStandaloneController } from './goals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignGoal, GoalNotification]),
    ScheduleModule.forRoot(),
  ],
  controllers: [GoalsController, GoalsStandaloneController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
