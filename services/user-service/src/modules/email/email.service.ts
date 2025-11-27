import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly notificationServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.notificationServiceUrl = this.configService.get(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:60007',
    );
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:60010')}/reset-password?token=${resetToken}`;

    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: '重置密码 - lnk.day',
        template: 'password-reset',
        data: {
          resetToken,
          resetLink,
          expiresIn: '1小时',
        },
      });

      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      // 不抛出错误，避免暴露邮件发送失败的信息
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: '欢迎加入 lnk.day',
        template: 'welcome',
        data: { name },
      });

      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
    }
  }

  async sendSecurityAlertEmail(
    to: string,
    alertType: string,
    details: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: '安全提醒 - lnk.day',
        template: 'security-alert',
        data: { alertType, details },
      });

      this.logger.log(`Security alert email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send security alert email: ${error.message}`);
    }
  }
}
