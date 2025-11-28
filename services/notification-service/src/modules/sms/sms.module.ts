import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { SmsProcessor } from './sms.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sms',
    }),
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsProcessor],
  exports: [SmsService],
})
export class SmsModule {}
