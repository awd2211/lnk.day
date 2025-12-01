import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationLog } from './entities/notification-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationTemplate,
      NotificationChannel,
      NotificationLog,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
