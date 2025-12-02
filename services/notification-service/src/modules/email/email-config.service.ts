import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export type EmailProvider = 'smtp' | 'mailgun' | 'sendgrid' | 'ses';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  region: 'us' | 'eu';
}

export interface EmailSettings {
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  smtp?: SmtpConfig;
  mailgun?: MailgunConfig;
}

@Injectable()
export class EmailConfigService implements OnModuleInit {
  private readonly logger = new Logger(EmailConfigService.name);
  private readonly consoleServiceUrl: string;
  private readonly brandName: string;
  private readonly brandDomain: string;
  private settings: EmailSettings;
  private configVersion = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.consoleServiceUrl = this.configService.get('CONSOLE_SERVICE_URL', 'http://localhost:60009');
    this.brandName = this.configService.get('BRAND_NAME', 'lnk.day');
    this.brandDomain = this.configService.get('BRAND_DOMAIN', 'lnk.day');

    // Initialize with environment defaults
    this.settings = {
      provider: this.configService.get('EMAIL_PROVIDER', 'smtp') as EmailProvider,
      fromEmail: this.configService.get('EMAIL_FROM', `noreply@${this.brandDomain}`),
      fromName: this.configService.get('EMAIL_FROM_NAME', this.brandName),
      smtp: {
        host: this.configService.get('SMTP_HOST', 'localhost'),
        port: parseInt(this.configService.get('SMTP_PORT', '587'), 10),
        secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
        user: this.configService.get('SMTP_USER', ''),
        pass: this.configService.get('SMTP_PASS', ''),
      },
      mailgun: {
        apiKey: this.configService.get('MAILGUN_API_KEY', ''),
        domain: this.configService.get('MAILGUN_DOMAIN', ''),
        region: this.configService.get('MAILGUN_REGION', 'us') as 'us' | 'eu',
      },
    };
  }

  async onModuleInit() {
    await this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.consoleServiceUrl}/api/v1/system/email-settings-internal`),
      );

      if (response.data) {
        this.settings = response.data;
        this.configVersion++;
        this.logger.log(`Email config loaded from console-service (version ${this.configVersion})`);
      }
    } catch (error) {
      this.logger.warn('Could not load email config from console-service, using environment defaults');
    }
  }

  async reloadConfig(): Promise<{ success: boolean; version: number }> {
    await this.loadConfig();
    return { success: true, version: this.configVersion };
  }

  getSettings(): EmailSettings {
    return this.settings;
  }

  getProvider(): EmailProvider {
    return this.settings.provider;
  }

  getFromEmail(): string {
    return this.settings.fromEmail;
  }

  getFromName(): string {
    return this.settings.fromName;
  }

  getSmtpConfig(): SmtpConfig | undefined {
    return this.settings.smtp;
  }

  getMailgunConfig(): MailgunConfig | undefined {
    return this.settings.mailgun;
  }

  getVersion(): number {
    return this.configVersion;
  }
}
