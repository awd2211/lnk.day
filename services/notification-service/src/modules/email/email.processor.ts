import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { EmailJob } from './email.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'localhost'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  @Process('send')
  async handleSendEmail(job: Job<EmailJob>): Promise<void> {
    const { to, subject, template, data } = job.data;
    this.logger.log(`Sending email to ${to}: ${subject}`);

    try {
      const html = this.renderTemplate(template, data);

      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@lnk.day'),
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    const templates: Record<string, string> = {
      welcome: `
        <h1>欢迎加入 lnk.day, ${data.name}!</h1>
        <p>感谢您注册我们的服务。</p>
      `,
      'password-reset': `
        <h1>重置密码</h1>
        <p>点击下面的链接重置您的密码：</p>
        <a href="https://lnk.day/reset-password?token=${data.resetToken}">重置密码</a>
      `,
    };
    return templates[template] || '';
  }
}
