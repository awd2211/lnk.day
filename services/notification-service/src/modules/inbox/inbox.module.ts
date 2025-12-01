import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { UserNotification } from './entities/user-notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserNotification,
      NotificationPreference,
    ]),
  ],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
