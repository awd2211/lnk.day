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

  // ========== 团队邀请相关邮件 ==========

  async sendTeamInvitationEmail(
    to: string,
    teamName: string,
    inviteLink: string,
    message?: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: `您被邀请加入团队「${teamName}」 - lnk.day`,
        template: 'team-invitation',
        data: {
          teamName,
          inviteLink,
          message,
          expiresIn: '7天',
        },
      });

      this.logger.log(`Team invitation email sent to ${to} for team ${teamName}`);
    } catch (error: any) {
      this.logger.error(`Failed to send team invitation email: ${error.message}`);
    }
  }

  async sendInvitationAcceptedEmail(
    to: string,
    memberName: string,
    teamName: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: `${memberName} 已接受加入团队「${teamName}」 - lnk.day`,
        template: 'invitation-accepted',
        data: {
          memberName,
          teamName,
        },
      });

      this.logger.log(`Invitation accepted notification sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send invitation accepted email: ${error.message}`);
    }
  }

  async sendRemovedFromTeamEmail(
    to: string,
    teamName: string,
    reason?: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: `您已被移出团队「${teamName}」 - lnk.day`,
        template: 'removed-from-team',
        data: {
          teamName,
          reason,
        },
      });

      this.logger.log(`Removed from team notification sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send removed from team email: ${error.message}`);
    }
  }

  async sendRoleChangedEmail(
    to: string,
    teamName: string,
    newRole: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: `您在团队「${teamName}」的角色已更新 - lnk.day`,
        template: 'role-changed',
        data: {
          teamName,
          newRole,
        },
      });

      this.logger.log(`Role changed notification sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send role changed email: ${error.message}`);
    }
  }

  // ========== 隐私和合规相关邮件 ==========

  async sendDataExportReadyEmail(
    to: string,
    downloadUrl: string,
    expiresIn: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: '您的数据导出已准备就绪 - lnk.day',
        template: 'data-export-ready',
        data: {
          downloadUrl,
          expiresIn,
        },
      });

      this.logger.log(`Data export ready email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send data export ready email: ${error.message}`);
    }
  }

  async sendPrivacyRequestEmail(
    to: string,
    subject: string,
    requestType: string,
    scheduledDate?: Date,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject,
        template: 'privacy-request',
        data: {
          requestType,
          scheduledDate: scheduledDate?.toLocaleDateString('zh-CN'),
          coolingPeriod: '30天',
        },
      });

      this.logger.log(`Privacy request email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send privacy request email: ${error.message}`);
    }
  }

  async sendAccountDeletionWarningEmail(
    to: string,
    daysRemaining: number,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: `账户删除提醒 - 还有${daysRemaining}天 - lnk.day`,
        template: 'deletion-warning',
        data: {
          daysRemaining,
        },
      });

      this.logger.log(`Account deletion warning sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send deletion warning email: ${error.message}`);
    }
  }

  async sendAccountDeletedEmail(to: string): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/email/send`, {
        to,
        subject: '您的 lnk.day 账户已删除',
        template: 'account-deleted',
        data: {},
      });

      this.logger.log(`Account deleted email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send account deleted email: ${error.message}`);
    }
  }
}
