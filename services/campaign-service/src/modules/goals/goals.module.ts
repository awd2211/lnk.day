import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// ScheduleModule.forRoot() 只需在根模块 (AppModule) 中调用一次
import { CampaignGoal, GoalNotification } from './entities/campaign-goal.entity';
import { GoalsService } from './goals.service';
import { GoalsController, GoalsStandaloneController } from './goals.controller';


@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignGoal, GoalNotification]),
  ],
  controllers: [GoalsController, GoalsStandaloneController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
