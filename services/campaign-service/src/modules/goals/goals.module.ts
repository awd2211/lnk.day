import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CampaignGoal, GoalNotification } from './entities/campaign-goal.entity';
import { GoalsService } from './goals.service';
import { GoalsController, GoalsStandaloneController } from './goals.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignGoal, GoalNotification]),
    ScheduleModule.forRoot(),
    AuthModule,
  ],
  controllers: [GoalsController, GoalsStandaloneController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
