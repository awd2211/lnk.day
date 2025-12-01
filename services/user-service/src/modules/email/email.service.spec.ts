import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { EmailService } from './email.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        NOTIFICATION_SERVICE_URL: 'http://localhost:60007',
        FRONTEND_URL: 'http://localhost:60010',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);

    mockedAxios.post.mockReset();
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      await service.sendPasswordResetEmail('test@example.com', 'reset-token-123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'test@example.com',
          subject: '重置密码 - lnk.day',
          template: 'password-reset',
          data: expect.objectContaining({
            resetToken: 'reset-token-123',
            resetLink: 'http://localhost:60010/reset-password?token=reset-token-123',
          }),
        }),
      );
    });

    it('should not throw on failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.sendPasswordResetEmail('test@example.com', 'reset-token'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      await service.sendWelcomeEmail('test@example.com', 'John');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'test@example.com',
          subject: '欢迎加入 lnk.day',
          template: 'welcome',
          data: { name: 'John' },
        }),
      );
    });

    it('should not throw on failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.sendWelcomeEmail('test@example.com', 'John'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendEmailVerificationEmail', () => {
    it('should send email verification email', async () => {
      await service.sendEmailVerificationEmail('test@example.com', 'verify-token-123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'test@example.com',
          subject: '验证您的邮箱 - lnk.day',
          template: 'email-verification',
          data: expect.objectContaining({
            verifyLink: 'http://localhost:60010/verify-email?token=verify-token-123',
          }),
        }),
      );
    });

    it('should not throw on failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.sendEmailVerificationEmail('test@example.com', 'token'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendSecurityAlertEmail', () => {
    it('should send security alert email', async () => {
      await service.sendSecurityAlertEmail(
        'test@example.com',
        'new_login',
        'New login from unknown device',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'test@example.com',
          subject: '安全提醒 - lnk.day',
          template: 'security-alert',
          data: {
            alertType: 'new_login',
            details: 'New login from unknown device',
          },
        }),
      );
    });

    it('should not throw on failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.sendSecurityAlertEmail('test@example.com', 'alert', 'details'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendTeamInvitationEmail', () => {
    it('should send team invitation email', async () => {
      await service.sendTeamInvitationEmail(
        'invited@example.com',
        'Awesome Team',
        'http://localhost:60010/invite/abc123',
        'Please join us!',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'invited@example.com',
          subject: '您被邀请加入团队「Awesome Team」 - lnk.day',
          template: 'team-invitation',
          data: expect.objectContaining({
            teamName: 'Awesome Team',
            inviteLink: 'http://localhost:60010/invite/abc123',
            message: 'Please join us!',
          }),
        }),
      );
    });

    it('should send without message', async () => {
      await service.sendTeamInvitationEmail(
        'invited@example.com',
        'Team',
        'http://example.com',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          data: expect.objectContaining({
            message: undefined,
          }),
        }),
      );
    });
  });

  describe('sendInvitationAcceptedEmail', () => {
    it('should send invitation accepted notification', async () => {
      await service.sendInvitationAcceptedEmail(
        'admin@example.com',
        'New Member',
        'Awesome Team',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'admin@example.com',
          subject: 'New Member 已接受加入团队「Awesome Team」 - lnk.day',
          template: 'invitation-accepted',
        }),
      );
    });
  });

  describe('sendRemovedFromTeamEmail', () => {
    it('should send removed from team notification', async () => {
      await service.sendRemovedFromTeamEmail(
        'user@example.com',
        'Team Name',
        'Violation of policy',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'user@example.com',
          subject: '您已被移出团队「Team Name」 - lnk.day',
          template: 'removed-from-team',
          data: expect.objectContaining({
            teamName: 'Team Name',
            reason: 'Violation of policy',
          }),
        }),
      );
    });
  });

  describe('sendRoleChangedEmail', () => {
    it('should send role changed notification', async () => {
      await service.sendRoleChangedEmail('user@example.com', 'Team Name', 'ADMIN');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'user@example.com',
          subject: '您在团队「Team Name」的角色已更新 - lnk.day',
          template: 'role-changed',
          data: {
            teamName: 'Team Name',
            newRole: 'ADMIN',
          },
        }),
      );
    });
  });

  describe('sendDataExportReadyEmail', () => {
    it('should send data export ready notification', async () => {
      await service.sendDataExportReadyEmail(
        'user@example.com',
        'http://example.com/download/export.zip',
        '24小时',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'user@example.com',
          subject: '您的数据导出已准备就绪 - lnk.day',
          template: 'data-export-ready',
          data: {
            downloadUrl: 'http://example.com/download/export.zip',
            expiresIn: '24小时',
          },
        }),
      );
    });
  });

  describe('sendPrivacyRequestEmail', () => {
    it('should send privacy request notification with scheduled date', async () => {
      const scheduledDate = new Date('2024-12-31');
      await service.sendPrivacyRequestEmail(
        'user@example.com',
        '账户删除确认',
        'delete',
        scheduledDate,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'user@example.com',
          subject: '账户删除确认',
          template: 'privacy-request',
          data: expect.objectContaining({
            requestType: 'delete',
          }),
        }),
      );
    });

    it('should send without scheduled date', async () => {
      await service.sendPrivacyRequestEmail('user@example.com', '数据导出', 'export');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          data: expect.objectContaining({
            requestType: 'export',
            scheduledDate: undefined,
          }),
        }),
      );
    });
  });

  describe('sendAccountDeletionWarningEmail', () => {
    it('should send account deletion warning', async () => {
      await service.sendAccountDeletionWarningEmail('user@example.com', 7);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'user@example.com',
          subject: '账户删除提醒 - 还有7天 - lnk.day',
          template: 'deletion-warning',
          data: { daysRemaining: 7 },
        }),
      );
    });
  });

  describe('sendAccountDeletedEmail', () => {
    it('should send account deleted confirmation', async () => {
      await service.sendAccountDeletedEmail('user@example.com');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:60007/email/send',
        expect.objectContaining({
          to: 'user@example.com',
          subject: '您的 lnk.day 账户已删除',
          template: 'account-deleted',
          data: {},
        }),
      );
    });
  });
});
