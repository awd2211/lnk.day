import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailConfigService } from './email-config.service';
import { NotificationTemplate } from '../notifications/entities/notification-template.entity';
import { NotificationLog } from '../notifications/entities/notification-log.entity';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    HttpModule,
    TypeOrmModule.forFeature([NotificationTemplate, NotificationLog]),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor, EmailConfigService],
  exports: [EmailService, EmailConfigService],
})
export class EmailModule {}
