import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export type SmsProvider = 'twilio' | 'aws_sns' | 'vonage';

export interface SmsMessage {
  to: string;
  body: string;
  from?: string;
  provider?: SmsProvider;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  provider: SmsProvider;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any;
  private snsClient: any;

  // Provider configurations
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;
  private readonly twilioFromNumber: string;

  private readonly awsRegion: string;
  private readonly awsAccessKey: string;
  private readonly awsSecretKey: string;

  private readonly defaultProvider: SmsProvider;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue('sms')
    private readonly smsQueue: Queue,
  ) {
    // Twilio config
    this.twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    this.twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioFromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    // AWS config
    this.awsRegion = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.awsAccessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    this.awsSecretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    // Default provider
    this.defaultProvider = this.configService.get<SmsProvider>('SMS_PROVIDER', 'twilio');

    // Initialize clients
    this.initializeClients();
  }

  private async initializeClients() {
    // Initialize Twilio
    if (this.twilioAccountSid && this.twilioAuthToken) {
      try {
        const twilio = await import('twilio');
        this.twilioClient = twilio.default(this.twilioAccountSid, this.twilioAuthToken);
        this.logger.log('Twilio client initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize Twilio client');
      }
    }

    // Initialize AWS SNS
    if (this.awsAccessKey && this.awsSecretKey) {
      try {
        const { SNSClient } = await import('@aws-sdk/client-sns');
        this.snsClient = new SNSClient({
          region: this.awsRegion,
          credentials: {
            accessKeyId: this.awsAccessKey,
            secretAccessKey: this.awsSecretKey,
          },
        });
        this.logger.log('AWS SNS client initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize AWS SNS client');
      }
    }
  }

  async sendSms(message: SmsMessage): Promise<SmsResult> {
    const provider = message.provider || this.defaultProvider;

    switch (provider) {
      case 'twilio':
        return this.sendViaTwilio(message);
      case 'aws_sns':
        return this.sendViaAwsSns(message);
      default:
        return { success: false, provider, error: 'Unknown provider' };
    }
  }

  async queueSms(message: SmsMessage): Promise<void> {
    await this.smsQueue.add('send', message, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  private async sendViaTwilio(message: SmsMessage): Promise<SmsResult> {
    if (!this.twilioClient) {
      return { success: false, provider: 'twilio', error: 'Twilio client not configured' };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message.body,
        to: message.to,
        from: message.from || this.twilioFromNumber,
      });

      this.logger.log(`SMS sent via Twilio: ${result.sid}`);
      return { success: true, messageId: result.sid, provider: 'twilio' };
    } catch (error) {
      this.logger.error(`Twilio SMS failed: ${error.message}`);
      return { success: false, provider: 'twilio', error: error.message };
    }
  }

  private async sendViaAwsSns(message: SmsMessage): Promise<SmsResult> {
    if (!this.snsClient) {
      return { success: false, provider: 'aws_sns', error: 'AWS SNS client not configured' };
    }

    try {
      const { PublishCommand } = await import('@aws-sdk/client-sns');
      const command = new PublishCommand({
        Message: message.body,
        PhoneNumber: message.to,
      });

      const result = await this.snsClient.send(command);
      this.logger.log(`SMS sent via AWS SNS: ${result.MessageId}`);
      return { success: true, messageId: result.MessageId, provider: 'aws_sns' };
    } catch (error) {
      this.logger.error(`AWS SNS SMS failed: ${error.message}`);
      return { success: false, provider: 'aws_sns', error: error.message };
    }
  }

  // Pre-built SMS templates
  async sendVerificationCode(to: string, code: string): Promise<SmsResult> {
    return this.sendSms({
      to,
      body: `Your lnk.day verification code is: ${code}. Valid for 10 minutes.`,
    });
  }

  async sendLinkMilestoneAlert(to: string, linkTitle: string, clicks: number): Promise<SmsResult> {
    return this.sendSms({
      to,
      body: `🎉 Your link "${linkTitle}" has reached ${clicks.toLocaleString()} clicks! Check your dashboard for details.`,
    });
  }

  async sendSecurityAlert(to: string, alertType: string, details: string): Promise<SmsResult> {
    return this.sendSms({
      to,
      body: `⚠️ Security Alert: ${alertType}. ${details}. Login to lnk.day to review.`,
    });
  }

  async sendLinkDownAlert(to: string, linkTitle: string, shortUrl: string): Promise<SmsResult> {
    return this.sendSms({
      to,
      body: `🚨 Alert: Your link "${linkTitle}" (${shortUrl}) destination is unreachable. Please check your configuration.`,
    });
  }

  async sendWeeklyDigest(
    to: string,
    stats: { totalClicks: number; topLink: string; growth: string },
  ): Promise<SmsResult> {
    return this.sendSms({
      to,
      body: `📊 Weekly lnk.day digest: ${stats.totalClicks.toLocaleString()} clicks (${stats.growth}). Top link: ${stats.topLink}`,
    });
  }

  // Check provider availability
  getAvailableProviders(): SmsProvider[] {
    const providers: SmsProvider[] = [];
    if (this.twilioClient) providers.push('twilio');
    if (this.snsClient) providers.push('aws_sns');
    return providers;
  }

  // Validate phone number format
  validatePhoneNumber(phone: string): boolean {
    // E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }
}
