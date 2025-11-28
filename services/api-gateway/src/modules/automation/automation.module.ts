import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationWebhook } from './entities/automation-webhook.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationWebhook]),
    ConfigModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
