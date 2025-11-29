import { Module, Global } from '@nestjs/common';
import { NotificationModule as SharedNotificationModule } from '@lnk/nestjs-common';
import { LinkNotificationService } from './link-notification.service';

@Global()
@Module({
  imports: [SharedNotificationModule],
  providers: [LinkNotificationService],
  exports: [LinkNotificationService],
})
export class NotificationModule {}
