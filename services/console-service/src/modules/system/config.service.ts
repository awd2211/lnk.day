import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SystemConfig, EmailProvider, SmtpConfig, MailgunConfig } from './entities/system-config.entity';

export interface EmailSettings {
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  smtp?: SmtpConfig;
  mailgun?: MailgunConfig;
}

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl = this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020');
  }

  async getConfig(key: string): Promise<SystemConfig | null> {
    return this.configRepository.findOne({ where: { key } });
  }

  async setConfig(key: string, value: Record<string, any>, options?: { description?: string; isSecret?: boolean }): Promise<SystemConfig> {
    let config = await this.configRepository.findOne({ where: { key } });

    if (config) {
      config.value = value;
      if (options?.description) config.description = options.description;
      if (options?.isSecret !== undefined) config.isSecret = options.isSecret;
    } else {
      config = this.configRepository.create({
        key,
        value,
        description: options?.description,
        isSecret: options?.isSecret ?? false,
      });
    }

    return this.configRepository.save(config);
  }

  async deleteConfig(key: string): Promise<void> {
    const config = await this.configRepository.findOne({ where: { key } });
    if (config) {
      await this.configRepository.remove(config);
    }
  }

  // Email Configuration
  async getEmailSettings(): Promise<EmailSettings | null> {
    const config = await this.getConfig('email');
    if (!config) {
      // Return defaults from environment
      return {
        provider: (this.configService.get('EMAIL_PROVIDER', 'smtp') as EmailProvider),
        fromEmail: this.configService.get('EMAIL_FROM', 'noreply@lnk.day'),
        fromName: this.configService.get('EMAIL_FROM_NAME', 'lnk.day'),
        smtp: {
          host: this.configService.get('SMTP_HOST', ''),
          port: parseInt(this.configService.get('SMTP_PORT', '587'), 10),
          secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
          user: this.configService.get('SMTP_USER', ''),
          pass: '', // Don't expose password
        },
        mailgun: {
          apiKey: '', // Don't expose key
          domain: this.configService.get('MAILGUN_DOMAIN', ''),
          region: (this.configService.get('MAILGUN_REGION', 'us') as 'us' | 'eu'),
        },
      };
    }

    const settings = config.value as EmailSettings;
    // Mask sensitive data for response
    if (settings.smtp?.pass) {
      settings.smtp.pass = '••••••••';
    }
    if (settings.mailgun?.apiKey) {
      settings.mailgun.apiKey = settings.mailgun.apiKey.substring(0, 8) + '••••••••';
    }

    return settings;
  }

  async updateEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
    const current = await this.getConfig('email');
    const currentValue = (current?.value as EmailSettings) || {};

    // Merge with existing, preserving secrets if not provided
    const merged: EmailSettings = {
      provider: settings.provider ?? currentValue.provider ?? 'smtp',
      fromEmail: settings.fromEmail ?? currentValue.fromEmail ?? 'noreply@lnk.day',
      fromName: settings.fromName ?? currentValue.fromName ?? 'lnk.day',
      smtp: {
        host: settings.smtp?.host ?? currentValue.smtp?.host ?? '',
        port: settings.smtp?.port ?? currentValue.smtp?.port ?? 587,
        secure: settings.smtp?.secure ?? currentValue.smtp?.secure ?? false,
        user: settings.smtp?.user ?? currentValue.smtp?.user ?? '',
        pass: (settings.smtp?.pass && !settings.smtp.pass.includes('••••'))
          ? settings.smtp.pass
          : currentValue.smtp?.pass ?? '',
      },
      mailgun: {
        apiKey: (settings.mailgun?.apiKey && !settings.mailgun.apiKey.includes('••••'))
          ? settings.mailgun.apiKey
          : currentValue.mailgun?.apiKey ?? '',
        domain: settings.mailgun?.domain ?? currentValue.mailgun?.domain ?? '',
        region: settings.mailgun?.region ?? currentValue.mailgun?.region ?? 'us',
      },
    };

    await this.setConfig('email', merged as unknown as Record<string, any>, {
      description: '邮件服务配置',
      isSecret: true,
    });

    // Notify notification-service to reload config
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/config/reload`),
      );
      this.logger.log('Notification service config reloaded');
    } catch (error) {
      this.logger.warn('Failed to reload notification service config - may need restart');
    }

    // Return masked version
    return this.getEmailSettings() as Promise<EmailSettings>;
  }

  async testEmailSettings(testEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/email/test`, {
          to: testEmail,
        }),
      );
      return { success: true, message: '测试邮件已发送' };
    } catch (error: any) {
      this.logger.error('Email test failed', error);
      return {
        success: false,
        message: error.response?.data?.message || '发送测试邮件失败',
      };
    }
  }

  // Email Template Management
  async getEmailTemplates(): Promise<Record<string, { subject: string; html: string }>> {
    const config = await this.getConfig('email_templates');
    if (!config) {
      // Return default templates
      return this.getDefaultEmailTemplates();
    }
    return config.value as Record<string, { subject: string; html: string }>;
  }

  async updateEmailTemplate(templateId: string, data: { subject: string; html: string }): Promise<{ success: boolean; message: string }> {
    const templates = await this.getEmailTemplates();
    templates[templateId] = data;

    await this.setConfig('email_templates', templates, {
      description: '邮件模板配置',
    });

    // Notify notification-service to reload templates
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/config/reload`),
      );
      this.logger.log('Notification service templates reloaded');
    } catch (error) {
      this.logger.warn('Failed to reload notification service templates');
    }

    return { success: true, message: '模板已更新' };
  }

  async resetEmailTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
    const templates = await this.getEmailTemplates();
    const defaults = this.getDefaultEmailTemplates();

    if (defaults[templateId]) {
      templates[templateId] = defaults[templateId];
      await this.setConfig('email_templates', templates, {
        description: '邮件模板配置',
      });
      return { success: true, message: '模板已重置为默认值' };
    }

    return { success: false, message: '未找到该模板' };
  }

  private getDefaultEmailTemplates(): Record<string, { subject: string; html: string }> {
    return {
      welcome: {
        subject: '欢迎加入 lnk.day, {{name}}!',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">欢迎加入 lnk.day, {{name}}!</h1>
  <p style="color: #666;">感谢您注册我们的服务。</p>
</div>`,
      },
      'password-reset': {
        subject: '重置密码 - lnk.day',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">重置密码</h1>
  <p style="color: #666;">点击下面的链接重置您的密码：</p>
  <a href="{{resetLink}}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
    重置密码
  </a>
</div>`,
      },
      'team-invite': {
        subject: '{{inviterName}} 邀请您加入 {{teamName}}',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">团队邀请</h1>
  <p style="color: #666;">{{inviterName}} 邀请您加入 {{teamName}}。</p>
  <a href="{{inviteLink}}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
    接受邀请
  </a>
</div>`,
      },
      'link-milestone': {
        subject: '恭喜！您的链接达到了 {{clicks}} 次点击',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">🎉 恭喜!</h1>
  <p style="color: #666;">您的链接 "{{linkTitle}}" 已达到 {{clicks}} 次点击！</p>
</div>`,
      },
      'weekly-report': {
        subject: 'lnk.day 周报 - 您的链接表现如何？',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">lnk.day 周报</h1>
  <p style="color: #666;">本周总点击量：{{totalClicks}}</p>
  <p style="color: #666;">增长率：{{growth}}%</p>
</div>`,
      },
      'security-alert': {
        subject: '安全提醒 - lnk.day',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #dc2626;">⚠️ 安全提醒</h1>
  <p style="color: #666;">检测到 {{alertType}}：{{details}}</p>
</div>`,
      },
      test: {
        subject: 'lnk.day 测试邮件',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">lnk.day</h1>
  </div>
  <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px;">
    <h2 style="color: #1a1a1a; margin-top: 0;">✅ 测试邮件</h2>
    <p style="color: #666;">{{message}}</p>
    <p style="color: #999; font-size: 12px;">发送时间: {{timestamp}}</p>
  </div>
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
    如果您收到了这封邮件，说明您的邮件配置已正确设置。
  </p>
</div>`,
      },
    };
  }

  // Internal method - returns unmasked settings for service-to-service communication
  async getEmailSettingsInternal(): Promise<EmailSettings | null> {
    const config = await this.getConfig('email');
    if (!config) {
      // Return defaults from environment
      return {
        provider: (this.configService.get('EMAIL_PROVIDER', 'smtp') as EmailProvider),
        fromEmail: this.configService.get('EMAIL_FROM', 'noreply@lnk.day'),
        fromName: this.configService.get('EMAIL_FROM_NAME', 'lnk.day'),
        smtp: {
          host: this.configService.get('SMTP_HOST', ''),
          port: parseInt(this.configService.get('SMTP_PORT', '587'), 10),
          secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
          user: this.configService.get('SMTP_USER', ''),
          pass: this.configService.get('SMTP_PASS', ''),
        },
        mailgun: {
          apiKey: this.configService.get('MAILGUN_API_KEY', ''),
          domain: this.configService.get('MAILGUN_DOMAIN', ''),
          region: (this.configService.get('MAILGUN_REGION', 'us') as 'us' | 'eu'),
        },
      };
    }

    return config.value as EmailSettings;
  }
}
