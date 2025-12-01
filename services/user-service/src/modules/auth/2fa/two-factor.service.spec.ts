import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { TwoFactorService } from './two-factor.service';
import { TwoFactorSecret } from './entities/two-factor-secret.entity';
import { createMockRepository, createMockJwtService, createMockConfigService } from '../../../../test/mocks';

// Mock crypto module
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    randomBytes: jest.fn((size: number) => Buffer.alloc(size, 'a')),
  };
});

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQrCode'),
}));

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let twoFactorRepository: ReturnType<typeof createMockRepository>;
  let jwtService: ReturnType<typeof createMockJwtService>;

  const mockTwoFactor: Partial<TwoFactorSecret> = {
    id: '2fa-123',
    userId: 'user-123',
    secret: 'encrypted-secret',
    backupCodes: ['hash1', 'hash2', 'hash3'],
    backupCodesUsed: 0,
    enabled: true,
    verified: true,
    lastUsedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    twoFactorRepository = createMockRepository();
    jwtService = createMockJwtService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: getRepositoryToken(TwoFactorSecret),
          useValue: twoFactorRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            APP_NAME: 'lnk.day',
            TWO_FACTOR_SECRET: 'test-encryption-key-32-characters!',
          }),
        },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enable2FA', () => {
    it('should enable 2FA for new user', async () => {
      twoFactorRepository.findOne.mockResolvedValue(null);
      twoFactorRepository.create.mockReturnValue({ userId: 'user-123' });
      twoFactorRepository.save.mockResolvedValue({ userId: 'user-123' });

      const result = await service.enable2FA('user-123', 'test@example.com');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('otpAuthUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(twoFactorRepository.create).toHaveBeenCalled();
      expect(twoFactorRepository.save).toHaveBeenCalled();
    });

    it('should update existing unverified 2FA setup', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: false,
        verified: false,
      });
      twoFactorRepository.save.mockResolvedValue({});

      const result = await service.enable2FA('user-123', 'test@example.com');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('backupCodes');
      expect(twoFactorRepository.create).not.toHaveBeenCalled();
      expect(twoFactorRepository.save).toHaveBeenCalled();
    });

    it('should throw if 2FA is already enabled and verified', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: true,
        verified: true,
      });

      await expect(service.enable2FA('user-123', 'test@example.com')).rejects.toThrow(
        new BadRequestException('2FA is already enabled'),
      );
    });
  });

  describe('verify2FA', () => {
    it('should throw NotFoundException if 2FA not set up', async () => {
      twoFactorRepository.findOne.mockResolvedValue(null);

      await expect(service.verify2FA('user-123', '123456')).rejects.toThrow(
        new NotFoundException('2FA not set up'),
      );
    });

    it('should throw UnauthorizedException for invalid code', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        secret: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:aabbccdd', // mock encrypted
      });

      // Mock decryptSecret to return a fixed secret
      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);

      await expect(service.verify2FA('user-123', 'invalid')).rejects.toThrow(
        new UnauthorizedException('Invalid 2FA code'),
      );
    });

    it('should verify successfully and enable 2FA', async () => {
      const twoFactorRecord = {
        ...mockTwoFactor,
        enabled: false,
        verified: false,
        secret: 'encrypted',
      };
      twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
      twoFactorRepository.save.mockResolvedValue(twoFactorRecord);

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(true);

      const result = await service.verify2FA('user-123', '123456');

      expect(result).toBe(true);
      expect(twoFactorRecord.verified).toBe(true);
      expect(twoFactorRecord.enabled).toBe(true);
      expect(twoFactorRecord.lastUsedAt).toBeInstanceOf(Date);
      expect(twoFactorRepository.save).toHaveBeenCalled();
    });
  });

  describe('disable2FA', () => {
    it('should throw if 2FA is not enabled', async () => {
      twoFactorRepository.findOne.mockResolvedValue(null);

      await expect(service.disable2FA('user-123', '123456')).rejects.toThrow(
        new BadRequestException('2FA is not enabled'),
      );
    });

    it('should throw if 2FA is disabled', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: false,
      });

      await expect(service.disable2FA('user-123', '123456')).rejects.toThrow(
        new BadRequestException('2FA is not enabled'),
      );
    });

    it('should throw UnauthorizedException for invalid code', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: true,
      });

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);
      jest.spyOn(service as any, 'verifyBackupCode').mockReturnValue(false);

      await expect(service.disable2FA('user-123', 'wrongcode')).rejects.toThrow(
        new UnauthorizedException('Invalid 2FA code'),
      );
    });

    it('should disable 2FA with valid TOTP code', async () => {
      const twoFactorRecord = {
        ...mockTwoFactor,
        enabled: true,
      };
      twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
      twoFactorRepository.remove.mockResolvedValue(twoFactorRecord);

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(true);

      await service.disable2FA('user-123', '123456');

      expect(twoFactorRepository.remove).toHaveBeenCalledWith(twoFactorRecord);
    });

    it('should disable 2FA with valid backup code', async () => {
      const twoFactorRecord = {
        ...mockTwoFactor,
        enabled: true,
      };
      twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
      twoFactorRepository.remove.mockResolvedValue(twoFactorRecord);

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);
      jest.spyOn(service as any, 'verifyBackupCode').mockReturnValue(true);

      await service.disable2FA('user-123', 'AAAA-BBBB');

      expect(twoFactorRepository.remove).toHaveBeenCalledWith(twoFactorRecord);
    });
  });

  describe('validateLogin', () => {
    it('should return true if 2FA is not enabled', async () => {
      twoFactorRepository.findOne.mockResolvedValue(null);

      const result = await service.validateLogin('user-123', '123456');

      expect(result).toBe(true);
    });

    it('should return true if 2FA is disabled', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: false,
      });

      const result = await service.validateLogin('user-123', '123456');

      expect(result).toBe(true);
    });

    it('should validate successfully with TOTP code', async () => {
      const twoFactorRecord = {
        ...mockTwoFactor,
        enabled: true,
      };
      twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
      twoFactorRepository.save.mockResolvedValue(twoFactorRecord);

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(true);

      const result = await service.validateLogin('user-123', '123456');

      expect(result).toBe(true);
      expect(twoFactorRecord.lastUsedAt).toBeInstanceOf(Date);
      expect(twoFactorRepository.save).toHaveBeenCalled();
    });

    it('should validate successfully with backup code', async () => {
      const twoFactorRecord = {
        ...mockTwoFactor,
        enabled: true,
        backupCodes: ['hash1', 'hash2'],
        backupCodesUsed: 0,
      };
      twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
      twoFactorRepository.save.mockResolvedValue(twoFactorRecord);

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);
      jest.spyOn(service as any, 'verifyBackupCode').mockReturnValue(true);

      const result = await service.validateLogin('user-123', 'AAAA-BBBB');

      expect(result).toBe(true);
      expect(twoFactorRecord.lastUsedAt).toBeInstanceOf(Date);
      expect(twoFactorRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid code', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: true,
      });

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);
      jest.spyOn(service as any, 'verifyBackupCode').mockReturnValue(false);

      await expect(service.validateLogin('user-123', 'invalid')).rejects.toThrow(
        new UnauthorizedException('Invalid 2FA code'),
      );
    });
  });

  describe('getStatus', () => {
    it('should return disabled status if no 2FA record', async () => {
      twoFactorRepository.findOne.mockResolvedValue(null);

      const result = await service.getStatus('user-123');

      expect(result).toEqual({
        enabled: false,
        verified: false,
        backupCodesRemaining: 0,
        lastUsedAt: null,
      });
    });

    it('should return correct status with 2FA enabled', async () => {
      const lastUsedAt = new Date();
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: true,
        verified: true,
        backupCodes: ['code1', 'code2', 'code3'],
        backupCodesUsed: 1,
        lastUsedAt,
      });

      const result = await service.getStatus('user-123');

      expect(result).toEqual({
        enabled: true,
        verified: true,
        backupCodesRemaining: 2, // 3 total - 1 used
        lastUsedAt,
      });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should throw if 2FA is not enabled', async () => {
      twoFactorRepository.findOne.mockResolvedValue(null);

      await expect(service.regenerateBackupCodes('user-123', '123456')).rejects.toThrow(
        new BadRequestException('2FA is not enabled'),
      );
    });

    it('should throw if 2FA is disabled', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: false,
      });

      await expect(service.regenerateBackupCodes('user-123', '123456')).rejects.toThrow(
        new BadRequestException('2FA is not enabled'),
      );
    });

    it('should throw UnauthorizedException for invalid code', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: true,
      });

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);

      await expect(service.regenerateBackupCodes('user-123', 'invalid')).rejects.toThrow(
        new UnauthorizedException('Invalid 2FA code'),
      );
    });

    it('should regenerate backup codes with valid TOTP', async () => {
      const twoFactorRecord = {
        ...mockTwoFactor,
        enabled: true,
        backupCodes: ['old1', 'old2'],
        backupCodesUsed: 5,
      };
      twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
      twoFactorRepository.save.mockResolvedValue(twoFactorRecord);

      jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(true);

      const result = await service.regenerateBackupCodes('user-123', '123456');

      expect(result).toHaveLength(10);
      expect(result[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(twoFactorRecord.backupCodesUsed).toBe(0);
      expect(twoFactorRepository.save).toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('should return false if no 2FA record', async () => {
      twoFactorRepository.findOne.mockResolvedValue(null);

      const result = await service.isEnabled('user-123');

      expect(result).toBe(false);
    });

    it('should return false if not enabled', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: false,
        verified: true,
      });

      const result = await service.isEnabled('user-123');

      expect(result).toBe(false);
    });

    it('should return false if not verified', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: true,
        verified: false,
      });

      const result = await service.isEnabled('user-123');

      expect(result).toBe(false);
    });

    it('should return true if enabled and verified', async () => {
      twoFactorRepository.findOne.mockResolvedValue({
        ...mockTwoFactor,
        enabled: true,
        verified: true,
      });

      const result = await service.isEnabled('user-123');

      expect(result).toBe(true);
    });
  });

  describe('generateTempToken', () => {
    it('should generate a temporary token', () => {
      jwtService.sign.mockReturnValue('temp-token');

      const result = service.generateTempToken('user-123');

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', type: '2fa_pending' },
        { expiresIn: '5m' },
      );
      expect(result).toBe('temp-token');
    });
  });

  describe('verifyTempToken', () => {
    it('should return userId for valid token', () => {
      jwtService.verify.mockReturnValue({ sub: 'user-123', type: '2fa_pending' });

      const result = service.verifyTempToken('valid-token');

      expect(result).toBe('user-123');
    });

    it('should return null for invalid token type', () => {
      jwtService.verify.mockReturnValue({ sub: 'user-123', type: 'wrong_type' });

      const result = service.verifyTempToken('token');

      expect(result).toBeNull();
    });

    it('should return null for invalid/expired token', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      const result = service.verifyTempToken('expired-token');

      expect(result).toBeNull();
    });
  });

  describe('private methods via public interface', () => {
    describe('encryption/decryption cycle', () => {
      it('should encrypt and decrypt correctly through enable2FA and verify2FA', async () => {
        // First enable 2FA
        twoFactorRepository.findOne.mockResolvedValue(null);
        twoFactorRepository.create.mockImplementation((data) => data);
        twoFactorRepository.save.mockImplementation(async (data) => data);

        const enableResult = await service.enable2FA('user-123', 'test@example.com');

        // The secret returned should be a valid Base32 string
        expect(enableResult.secret).toMatch(/^[A-Z2-7]+$/);
      });
    });

    describe('TOTP verification', () => {
      it('should handle TOTP verification within time window', async () => {
        const twoFactorRecord = {
          ...mockTwoFactor,
          enabled: false,
          verified: false,
          secret: 'encrypted',
        };
        twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
        twoFactorRepository.save.mockResolvedValue(twoFactorRecord);

        // Mock only decryptSecret, let verifyTOTP run naturally
        jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');

        // Generate the actual TOTP code
        const generateTOTP = (service as any).generateTOTP.bind(service);
        const validCode = generateTOTP('JBSWY3DPEHPK3PXP', 0);

        const result = await service.verify2FA('user-123', validCode);
        expect(result).toBe(true);
      });
    });

    describe('backup code verification', () => {
      it('should verify and consume backup code correctly', async () => {
        const hashBackupCode = (service as any).hashBackupCode.bind(service);
        const hashedCode = hashBackupCode('AAAA-BBBB');

        const twoFactorRecord = {
          ...mockTwoFactor,
          enabled: true,
          backupCodes: [hashedCode, 'other-hash'],
          backupCodesUsed: 0,
        };
        twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
        twoFactorRepository.save.mockResolvedValue(twoFactorRecord);

        jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
        jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);

        const result = await service.validateLogin('user-123', 'AAAA-BBBB');

        expect(result).toBe(true);
        expect(twoFactorRecord.backupCodesUsed).toBe(1);
        expect(twoFactorRecord.backupCodes).toHaveLength(1); // One code was removed
      });

      it('should handle backup code with different case', async () => {
        const hashBackupCode = (service as any).hashBackupCode.bind(service);
        const hashedCode = hashBackupCode('AAAA-BBBB');

        const twoFactorRecord = {
          ...mockTwoFactor,
          enabled: true,
          backupCodes: [hashedCode],
          backupCodesUsed: 0,
        };
        twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
        twoFactorRepository.save.mockResolvedValue(twoFactorRecord);

        jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
        jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);

        // Use lowercase - should still match
        const result = await service.validateLogin('user-123', 'aaaa-bbbb');

        expect(result).toBe(true);
      });

      it('should handle backup code without dash', async () => {
        const hashBackupCode = (service as any).hashBackupCode.bind(service);
        const hashedCode = hashBackupCode('AAAABBBB'); // No dash

        const twoFactorRecord = {
          ...mockTwoFactor,
          enabled: true,
          backupCodes: [hashedCode],
          backupCodesUsed: 0,
        };
        twoFactorRepository.findOne.mockResolvedValue(twoFactorRecord);
        twoFactorRepository.save.mockResolvedValue(twoFactorRecord);

        jest.spyOn(service as any, 'decryptSecret').mockReturnValue('JBSWY3DPEHPK3PXP');
        jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);

        const result = await service.validateLogin('user-123', 'AAAA-BBBB');

        expect(result).toBe(true);
      });
    });

    describe('base32 encoding/decoding', () => {
      it('should encode and decode correctly', () => {
        const base32Encode = (service as any).base32Encode.bind(service);
        const base32Decode = (service as any).base32Decode.bind(service);

        const original = Buffer.from('Hello World');
        const encoded = base32Encode(original);
        const decoded = base32Decode(encoded);

        expect(decoded.toString()).toBe('Hello World');
      });

      it('should handle empty buffer', () => {
        const base32Encode = (service as any).base32Encode.bind(service);

        const result = base32Encode(Buffer.alloc(0));

        expect(result).toBe('');
      });
    });

    describe('OTP auth URL generation', () => {
      it('should generate valid otpauth URL', async () => {
        twoFactorRepository.findOne.mockResolvedValue(null);
        twoFactorRepository.create.mockImplementation((data) => data);
        twoFactorRepository.save.mockImplementation(async (data) => data);

        const result = await service.enable2FA('user-123', 'test@example.com');

        expect(result.otpAuthUrl).toContain('otpauth://totp/');
        expect(result.otpAuthUrl).toContain('secret=');
        expect(result.otpAuthUrl).toContain('issuer=');
        expect(result.otpAuthUrl).toContain('test%40example.com');
      });

      it('should encode special characters in email', async () => {
        twoFactorRepository.findOne.mockResolvedValue(null);
        twoFactorRepository.create.mockImplementation((data) => data);
        twoFactorRepository.save.mockImplementation(async (data) => data);

        const result = await service.enable2FA('user-123', 'user+tag@example.com');

        expect(result.otpAuthUrl).toContain('user%2Btag%40example.com');
      });
    });

    describe('getEncryptionKey', () => {
      it('should throw error when TWO_FACTOR_SECRET is not set', async () => {
        // Create service without TWO_FACTOR_SECRET
        const moduleWithoutSecret = await Test.createTestingModule({
          providers: [
            TwoFactorService,
            {
              provide: getRepositoryToken(TwoFactorSecret),
              useValue: twoFactorRepository,
            },
            {
              provide: JwtService,
              useValue: jwtService,
            },
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string) => {
                  if (key === 'APP_NAME') return 'lnk.day';
                  return undefined; // TWO_FACTOR_SECRET not set
                }),
              },
            },
          ],
        }).compile();

        const serviceWithoutSecret = moduleWithoutSecret.get<TwoFactorService>(TwoFactorService);
        twoFactorRepository.findOne.mockResolvedValue(null);
        twoFactorRepository.create.mockImplementation((data) => data);

        await expect(
          serviceWithoutSecret.enable2FA('user-123', 'test@example.com'),
        ).rejects.toThrow('TWO_FACTOR_SECRET environment variable is required for 2FA');
      });
    });
  });
});
