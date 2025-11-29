import { Module, Global } from '@nestjs/common';
import { NotificationModule as SharedNotificationModule } from '@lnk/nestjs-common';
import { BillingNotificationService } from './billing-notification.service';

@Global()
@Module({
  imports: [SharedNotificationModule],
  providers: [BillingNotificationService],
  exports: [BillingNotificationService],
})
export class NotificationModule {}
