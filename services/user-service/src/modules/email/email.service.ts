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
      'http://localhost:60020',
    );
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:60010')}/reset-password?token=${resetToken}`;
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');

    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `重置密码 - ${appName}`,
        template: 'password_reset',
        data: {
          userName: to.split('@')[0],
          resetLink,
          expiryMinutes: 60,
          appName,
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
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
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

  async sendEmailVerificationEmail(to: string, verificationToken: string): Promise<void> {
    const verifyLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:60010')}/verify-email?token=${verificationToken}`;
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');

    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `验证您的邮箱 - ${appName}`,
        template: 'email_verification',
        data: {
          userName: to.split('@')[0],
          verificationLink: verifyLink,
          expiryHours: 24,
          appName,
        },
      });

      this.logger.log(`Email verification sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email verification: ${error.message}`);
    }
  }

  async sendSecurityAlertEmail(
    to: string,
    alertType: string,
    details: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
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

  /**
   * 发送登录验证码邮件
   */
  async sendLoginCodeEmail(to: string, code: string): Promise<void> {
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');

    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `${code} 是您的登录验证码 - ${appName}`,
        template: 'login_code',
        data: {
          userName: to.split('@')[0],
          code,
          expiryMinutes: 5,
          appName,
        },
      });

      this.logger.log(`Login code email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send login code email: ${error.message}`);
    }
  }

  // ========== 团队邀请相关邮件 ==========

  async sendTeamInvitationEmail(
    to: string,
    teamName: string,
    inviteLink: string,
    inviterName?: string,
    role?: string,
  ): Promise<void> {
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `您被邀请加入 ${teamName} 团队 - ${appName}`,
        template: 'team_invitation',
        data: {
          inviterName: inviterName || '团队管理员',
          teamName,
          role: role || 'MEMBER',
          invitationLink: inviteLink,
          expiryDays: 7,
          appName,
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
    role?: string,
  ): Promise<void> {
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `${memberName} 已加入团队 - ${appName}`,
        template: 'team_member_joined',
        data: {
          teamOwner: to.split('@')[0],
          memberName,
          teamName,
          role: role || 'MEMBER',
          joinedAt: new Date().toLocaleDateString('zh-CN'),
          appName,
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
    removedBy?: string,
  ): Promise<void> {
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `您已被移出 ${teamName} 团队 - ${appName}`,
        template: 'team_member_removed',
        data: {
          userName: to.split('@')[0],
          teamName,
          removedBy: removedBy || '团队管理员',
          removedAt: new Date().toLocaleDateString('zh-CN'),
          appName,
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
    oldRole: string,
    newRole: string,
    changedBy?: string,
  ): Promise<void> {
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `您在 ${teamName} 的角色已变更 - ${appName}`,
        template: 'team_role_changed',
        data: {
          userName: to.split('@')[0],
          teamName,
          oldRole,
          newRole,
          changedBy: changedBy || '团队管理员',
          changedAt: new Date().toLocaleDateString('zh-CN'),
          appName,
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
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `您的数据导出已准备就绪 - ${appName}`,
        template: 'data_export_ready',
        data: {
          userName: to.split('@')[0],
          downloadUrl,
          expiresIn,
          appName,
        },
      });

      this.logger.log(`Data export ready email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send data export ready email: ${error.message}`);
    }
  }

  async sendPrivacyRequestEmail(
    to: string,
    requestType: string,
    scheduledDate?: Date,
  ): Promise<void> {
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `隐私请求确认 - ${appName}`,
        template: 'privacy_request',
        data: {
          userName: to.split('@')[0],
          requestType,
          scheduledDate: scheduledDate?.toLocaleDateString('zh-CN'),
          coolingPeriod: 30,
          appName,
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
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `账户删除提醒 - 还有${daysRemaining}天 - ${appName}`,
        template: 'account_deletion_warning',
        data: {
          userName: to.split('@')[0],
          daysRemaining,
          cancelUrl: `${this.configService.get('FRONTEND_URL', 'http://localhost:60010')}/settings/privacy`,
          appName,
        },
      });

      this.logger.log(`Account deletion warning sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send deletion warning email: ${error.message}`);
    }
  }

  async sendAccountDeletedEmail(to: string): Promise<void> {
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `您的 ${appName} 账户已删除`,
        template: 'account_deleted',
        data: {
          userName: to.split('@')[0],
          appName,
        },
      });

      this.logger.log(`Account deleted email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send account deleted email: ${error.message}`);
    }
  }

  // ========== 安全警报邮件 ==========

  async sendSecurityAlertEmailV2(
    to: string,
    alertType: 'login_new_device' | 'password_changed' | 'suspicious_activity',
    details: {
      ipAddress?: string;
      location?: string;
      deviceInfo?: string;
      timestamp?: Date;
    },
  ): Promise<void> {
    const appName = this.configService.get('BRAND_NAME', 'lnk.day');
    const templateMap = {
      login_new_device: 'login_notification',
      password_changed: 'password_changed',
      suspicious_activity: 'security_alert',
    };
    const subjectMap = {
      login_new_device: '检测到新设备登录',
      password_changed: '您的密码已成功修改',
      suspicious_activity: '检测到可疑活动',
    };

    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
        to,
        subject: `${subjectMap[alertType]} - ${appName}`,
        template: templateMap[alertType],
        data: {
          userName: to.split('@')[0],
          loginTime: (details.timestamp || new Date()).toLocaleString('zh-CN'),
          changedAt: (details.timestamp || new Date()).toLocaleString('zh-CN'),
          ipAddress: details.ipAddress || '未知',
          location: details.location || '未知位置',
          deviceInfo: details.deviceInfo || '未知设备',
          appName,
        },
      });

      this.logger.log(`Security alert (${alertType}) email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send security alert email: ${error.message}`);
    }
  }
}
