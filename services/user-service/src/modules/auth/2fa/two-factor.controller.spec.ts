import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorController', () => {
  let controller: TwoFactorController;
  let twoFactorService: jest.Mocked<TwoFactorService>;

  const mockTwoFactorService = {
    getStatus: jest.fn(),
    enable2FA: jest.fn(),
    verify2FA: jest.fn(),
    disable2FA: jest.fn(),
    regenerateBackupCodes: jest.fn(),
    isEnabled: jest.fn(),
    validateLogin: jest.fn(),
    generateTempToken: jest.fn(),
    verifyTempToken: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    type: 'user',
    scope: { level: 'personal', teamId: 'user-123' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorController],
      providers: [
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<TwoFactorController>(TwoFactorController);
    twoFactorService = module.get(TwoFactorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return 2FA status', async () => {
      const statusResult = {
        enabled: true,
        verified: true,
        backupCodesRemaining: 8,
        lastUsedAt: new Date(),
      };
      mockTwoFactorService.getStatus.mockResolvedValue(statusResult);

      const result = await controller.getStatus(mockUser as any);

      expect(twoFactorService.getStatus).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(statusResult);
    });

    it('should return disabled status for user without 2FA', async () => {
      const statusResult = {
        enabled: false,
        verified: false,
        backupCodesRemaining: 0,
        lastUsedAt: null,
      };
      mockTwoFactorService.getStatus.mockResolvedValue(statusResult);

      const result = await controller.getStatus(mockUser as any);

      expect(result.enabled).toBe(false);
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA and return setup data', async () => {
      const enableResult = {
        secret: 'ABCDEFGHIJKLMNOP',
        qrCodeUrl: 'data:image/png;base64,mockQrCode',
        otpAuthUrl: 'otpauth://totp/lnk.day:test@example.com?secret=ABCDEFGHIJKLMNOP',
        backupCodes: ['1234-5678', '2345-6789'],
      };
      mockTwoFactorService.enable2FA.mockResolvedValue(enableResult);

      const result = await controller.enable2FA(mockUser as any);

      expect(twoFactorService.enable2FA).toHaveBeenCalledWith('user-123', 'test@example.com');
      expect(result).toEqual(enableResult);
      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.backupCodes).toBeDefined();
    });

    it('should use fallback email if not provided', async () => {
      const userWithoutEmail = { id: 'user-456', type: 'user', scope: {} };
      const enableResult = {
        secret: 'ABCDEFGHIJKLMNOP',
        qrCodeUrl: 'data:image/png;base64,mockQrCode',
        otpAuthUrl: 'otpauth://totp/lnk.day:user-456@lnk.day?secret=ABCDEFGHIJKLMNOP',
        backupCodes: ['1234-5678'],
      };
      mockTwoFactorService.enable2FA.mockResolvedValue(enableResult);

      await controller.enable2FA(userWithoutEmail as any);

      expect(twoFactorService.enable2FA).toHaveBeenCalledWith('user-456', 'user-user-456@lnk.day');
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA code and return success', async () => {
      mockTwoFactorService.verify2FA.mockResolvedValue(true);

      const result = await controller.verify2FA(mockUser as any, { code: '123456' });

      expect(twoFactorService.verify2FA).toHaveBeenCalledWith('user-123', '123456');
      expect(result).toEqual({ success: true, message: '2FA enabled successfully' });
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA and return success', async () => {
      mockTwoFactorService.disable2FA.mockResolvedValue(undefined);

      const result = await controller.disable2FA(mockUser as any, { code: '123456' });

      expect(twoFactorService.disable2FA).toHaveBeenCalledWith('user-123', '123456');
      expect(result).toEqual({ success: true, message: '2FA disabled successfully' });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes', async () => {
      const newBackupCodes = ['AAAA-BBBB', 'CCCC-DDDD', 'EEEE-FFFF'];
      mockTwoFactorService.regenerateBackupCodes.mockResolvedValue(newBackupCodes);

      const result = await controller.regenerateBackupCodes(mockUser as any, { code: '123456' });

      expect(twoFactorService.regenerateBackupCodes).toHaveBeenCalledWith('user-123', '123456');
      expect(result.backupCodes).toEqual(newBackupCodes);
      expect(result.backupCodes).toHaveLength(3);
    });
  });
});
