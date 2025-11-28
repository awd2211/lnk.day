import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SmsService, SmsMessage } from './sms.service';

@Processor('sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly smsService: SmsService) {}

  @Process('send')
  async handleSend(job: Job<SmsMessage>) {
    const message = job.data;
    this.logger.debug(`Processing SMS to: ${message.to}`);

    try {
      const result = await this.smsService.sendSms(message);

      if (!result.success) {
        throw new Error(result.error || 'SMS sending failed');
      }

      this.logger.log(`SMS sent successfully: ${result.messageId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      throw error;
    }
  }
}
