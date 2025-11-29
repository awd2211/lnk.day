import { Process, Processor, OnQueueActive } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { EmailJob } from './email.service';
import { EmailConfigService, EmailProvider } from './email-config.service';

interface MailgunClient {
  messages: {
    create: (domain: string, data: { from: string; to: string[]; subject: string; html: string }) => Promise<any>;
  };
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter | null = null;
  private mailgunClient: MailgunClient | null = null;
  private currentProvider: EmailProvider = 'smtp';
  private configVersion = -1;

  constructor(private readonly emailConfigService: EmailConfigService) {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const settings = this.emailConfigService.getSettings();
    this.currentProvider = settings.provider;

    if (this.currentProvider === 'mailgun') {
      this.initMailgun();
    } else {
      this.initSmtp();
    }

    this.configVersion = this.emailConfigService.getVersion();
  }

  private checkConfigUpdate(): void {
    if (this.configVersion !== this.emailConfigService.getVersion()) {
      this.logger.log('Email config updated, reinitializing provider...');
      this.initializeProvider();
    }
  }

  private initSmtp(): void {
    const smtp = this.emailConfigService.getSmtpConfig();
    if (!smtp) {
      this.logger.warn('SMTP config not available');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtp.host || 'localhost',
      port: smtp.port || 587,
      secure: smtp.secure || false,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });
    this.mailgunClient = null;
    this.logger.log('Email provider: SMTP');
  }

  private initMailgun(): void {
    const mailgun = this.emailConfigService.getMailgunConfig();
    if (!mailgun?.apiKey) {
      this.logger.warn('Mailgun API key not configured, falling back to SMTP');
      this.initSmtp();
      return;
    }

    const mg = new Mailgun(FormData);
    this.mailgunClient = mg.client({
      username: 'api',
      key: mailgun.apiKey,
      url: mailgun.region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net',
    });
    this.transporter = null;
    this.logger.log(`Email provider: Mailgun (${mailgun.region?.toUpperCase() || 'US'} region)`);
  }

  @Process('send')
  async handleSendEmail(job: Job<EmailJob>): Promise<void> {
    // Check for config updates before sending
    this.checkConfigUpdate();

    const { to, subject, template, data } = job.data;
    this.logger.log(`Sending email to ${to}: ${subject}`);

    try {
      const html = this.renderTemplate(template, data);

      if (this.currentProvider === 'mailgun' && this.mailgunClient) {
        await this.sendViaMailgun(to, subject, html);
      } else if (this.transporter) {
        await this.sendViaSmtp(to, subject, html);
      } else {
        throw new Error('No email provider configured');
      }

      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  private async sendViaSmtp(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) throw new Error('SMTP transporter not initialized');
    const fromEmail = this.emailConfigService.getFromEmail();
    const fromName = this.emailConfigService.getFromName();
    await this.transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    });
  }

  private async sendViaMailgun(to: string, subject: string, html: string): Promise<void> {
    if (!this.mailgunClient) throw new Error('Mailgun client not initialized');
    const mailgunConfig = this.emailConfigService.getMailgunConfig();
    const fromEmail = this.emailConfigService.getFromEmail();
    const fromName = this.emailConfigService.getFromName();
    await this.mailgunClient.messages.create(mailgunConfig?.domain || '', {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    const templates: Record<string, (d: Record<string, any>) => string> = {
      welcome: (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">欢迎加入 lnk.day, ${d.name}!</h1>
          <p style="color: #666;">感谢您注册我们的服务。</p>
        </div>
      `,
      'password-reset': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">重置密码</h1>
          <p style="color: #666;">点击下面的链接重置您的密码：</p>
          <a href="https://lnk.day/reset-password?token=${d.resetToken}"
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            重置密码
          </a>
        </div>
      `,
      'admin-password-reset': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; margin: 0;">lnk.day 管理后台</h1>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 30px;">
            <h2 style="color: #1a1a1a; margin-top: 0;">重置密码</h2>
            <p style="color: #666;">您好，${d.name}，</p>
            <p style="color: #666;">我们收到了重置您管理员账户密码的请求。点击下面的按钮来设置新密码：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${d.resetLink}"
                 style="display: inline-block; padding: 14px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                重置密码
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">此链接将在 ${d.expiresIn} 后过期。</p>
            <p style="color: #999; font-size: 12px;">如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
            © ${new Date().getFullYear()} lnk.day - 企业级链接管理平台
          </p>
        </div>
      `,
      'team-invite': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">团队邀请</h1>
          <p style="color: #666;">${d.inviterName} 邀请您加入 ${d.teamName}。</p>
          <a href="${d.inviteLink}"
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            接受邀请
          </a>
        </div>
      `,
      'link-milestone': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">🎉 恭喜!</h1>
          <p style="color: #666;">您的链接 "${d.linkTitle}" 已达到 ${d.clicks} 次点击！</p>
        </div>
      `,
      'weekly-report': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">lnk.day 周报</h1>
          <p style="color: #666;">本周总点击量：${d.totalClicks}</p>
          <p style="color: #666;">增长率：${d.growth}%</p>
        </div>
      `,
      'security-alert': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">⚠️ 安全提醒</h1>
          <p style="color: #666;">检测到 ${d.alertType}：${d.details}</p>
        </div>
      `,
      test: (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">lnk.day</h1>
          </div>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px;">
            <h2 style="color: #1a1a1a; margin-top: 0;">✅ 测试邮件</h2>
            <p style="color: #666;">${d.message}</p>
            <p style="color: #999; font-size: 12px;">发送时间: ${d.timestamp}</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
            如果您收到了这封邮件，说明您的邮件配置已正确设置。
          </p>
        </div>
      `,
    };
    const templateFn = templates[template];
    return templateFn ? templateFn(data) : '';
  }
}
