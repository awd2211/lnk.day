import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  async sendEmail(email: EmailJob): Promise<void> {
    await this.emailQueue.add('send', email, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: '欢迎加入 lnk.day',
      template: 'welcome',
      data: { name },
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: '重置密码 - lnk.day',
      template: 'password-reset',
      data: { resetToken },
    });
  }

  async sendTeamInviteEmail(to: string, inviterName: string, teamName: string, inviteLink: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `${inviterName} 邀请您加入 ${teamName}`,
      template: 'team-invite',
      data: { inviterName, teamName, inviteLink },
    });
  }

  async sendLinkMilestoneEmail(to: string, linkTitle: string, clicks: number): Promise<void> {
    await this.sendEmail({
      to,
      subject: `恭喜！您的链接达到了 ${clicks} 次点击`,
      template: 'link-milestone',
      data: { linkTitle, clicks },
    });
  }

  async sendWeeklyReportEmail(
    to: string,
    reportData: { totalClicks: number; topLinks: any[]; growth: number },
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'lnk.day 周报 - 您的链接表现如何？',
      template: 'weekly-report',
      data: reportData,
    });
  }

  async sendSecurityAlertEmail(to: string, alertType: string, details: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: '安全提醒 - lnk.day',
      template: 'security-alert',
      data: { alertType, details },
    });
  }
}
