import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

import { UserService } from './user.service';
import { User, UserStatus } from './entities/user.entity';
import { EmailService } from '../email/email.service';
import { createMockRepository, createMockEmailService } from '../../../test/mocks';

describe('UserService', () => {
  let service: UserService;
  let userRepository: ReturnType<typeof createMockRepository>;
  let emailService: ReturnType<typeof createMockEmailService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    status: UserStatus.ACTIVE,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    emailVerifiedAt: null,
    emailVerificationToken: undefined,
    emailVerificationTokenExpiresAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    userRepository = createMockRepository();
    emailService = createMockEmailService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should create a new user with hashed password', async () => {
      userRepository.create.mockReturnValue({ ...createUserDto, id: 'new-id' });
      userRepository.save.mockResolvedValue({ ...createUserDto, id: 'new-id', password: 'hashed-password' });

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashed-password',
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-456' }];
      userRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(userRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-123' } });
      expect(result.id).toBe('user-123');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateDto = { name: 'Updated Name' };
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      userRepository.save.mockResolvedValue({ ...mockUser, ...updateDto });

      const result = await service.update('user-123', updateDto);

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.remove('user-123');

      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      userRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.updatePassword('user-123', 'new-hashed-password');

      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        password: 'new-hashed-password',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });

      await expect(service.updatePassword('non-existent', 'new-hashed-password')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time and reset failed attempts', async () => {
      await service.updateLastLogin('user-123');

      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        lastLoginAt: expect.any(Date),
        failedLoginAttempts: 0,
        lockedUntil: undefined,
      });
    });
  });

  describe('isAccountLocked', () => {
    it('should return false if lockedUntil is not set', () => {
      const user = { ...mockUser, lockedUntil: undefined } as User;

      const result = service.isAccountLocked(user);

      expect(result).toBe(false);
    });

    it('should return true if account is still locked', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const user = { ...mockUser, lockedUntil: futureDate } as User;

      const result = service.isAccountLocked(user);

      expect(result).toBe(true);
    });

    it('should return false if lock has expired', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const user = { ...mockUser, lockedUntil: pastDate } as User;

      const result = service.isAccountLocked(user);

      expect(result).toBe(false);
    });
  });

  describe('getRemainingLockTime', () => {
    it('should return 0 if not locked', () => {
      const user = { ...mockUser, lockedUntil: undefined } as User;

      const result = service.getRemainingLockTime(user);

      expect(result).toBe(0);
    });

    it('should return remaining minutes', () => {
      const futureDate = new Date(Date.now() + 10 * 60000); // 10 minutes from now
      const user = { ...mockUser, lockedUntil: futureDate } as User;

      const result = service.getRemainingLockTime(user);

      expect(result).toBeGreaterThan(9);
      expect(result).toBeLessThanOrEqual(10);
    });
  });

  describe('recordFailedLogin', () => {
    it('should increment failed login attempts', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, failedLoginAttempts: 1 });

      const result = await service.recordFailedLogin('user-123');

      expect(userRepository.update).toHaveBeenCalledWith('user-123', { failedLoginAttempts: 2 });
      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(3); // MAX_LOGIN_ATTEMPTS (5) - 2
    });

    it('should lock account after max attempts', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, failedLoginAttempts: 4 });

      const result = await service.recordFailedLogin('user-123');

      expect(result.locked).toBe(true);
      expect(result.lockMinutes).toBe(15);
      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        failedLoginAttempts: 5,
        lockedUntil: expect.any(Date),
      });
    });
  });

  describe('unlockAccount', () => {
    it('should reset failed login attempts and unlock', async () => {
      await service.unlockAccount('user-123');

      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        failedLoginAttempts: 0,
        lockedUntil: undefined,
      });
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      userRepository.findOne.mockResolvedValue({ ...mockUser });
    });

    it('should change password when current password is correct', async () => {
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password check
        .mockResolvedValueOnce(false); // same password check
      userRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.changePassword('user-123', 'currentPassword', 'newPassword');

      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should throw if current password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(new BadRequestException('当前密码不正确'));
    });

    it('should throw if new password is same as current', async () => {
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password check
        .mockResolvedValueOnce(true); // same password check

      await expect(
        service.changePassword('user-123', 'currentPassword', 'currentPassword'),
      ).rejects.toThrow(new BadRequestException('新密码不能与当前密码相同'));
    });
  });

  describe('checkPasswordStrength', () => {
    it('should return password strength result', () => {
      const result = service.checkPasswordStrength('WeakPass1!');

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('requirements');
    });

    it('should handle empty password', () => {
      const result = service.checkPasswordStrength('');

      expect(result.score).toBe(0);
    });
  });

  describe('suspendUser', () => {
    it('should suspend a user', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      userRepository.save.mockResolvedValue({ ...mockUser, status: UserStatus.SUSPENDED });

      const result = await service.suspendUser('user-123', 'Test reason');

      expect(result.status).toBe(UserStatus.SUSPENDED);
    });
  });

  describe('unsuspendUser', () => {
    it('should unsuspend a user', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, status: UserStatus.SUSPENDED });
      userRepository.save.mockResolvedValue({ ...mockUser, status: UserStatus.ACTIVE });

      const result = await service.unsuspendUser('user-123');

      expect(result.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('sendEmailVerification', () => {
    it('should send verification email for unverified user', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, emailVerifiedAt: null });
      userRepository.save.mockResolvedValue({});

      const result = await service.sendEmailVerification('user-123');

      expect(emailService.sendEmailVerificationEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(String),
      );
      expect(result.message).toBe('验证邮件已发送，请检查您的邮箱');
    });

    it('should throw if email already verified', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, emailVerifiedAt: new Date() });

      await expect(service.sendEmailVerification('user-123')).rejects.toThrow(
        new BadRequestException('邮箱已验证'),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const tokenUser = { ...mockUser, emailVerificationToken: 'valid-token' };
      userRepository.findOne.mockResolvedValue(tokenUser);
      userRepository.save.mockResolvedValue({ ...tokenUser, emailVerifiedAt: new Date() });

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toBe('邮箱验证成功');
    });

    it('should throw for invalid token', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        new BadRequestException('无效的验证链接'),
      );
    });

    it('should throw for expired token', async () => {
      const expiredUser = {
        ...mockUser,
        emailVerificationToken: 'expired-token',
        emailVerificationTokenExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      userRepository.findOne.mockResolvedValue(expiredUser);

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        new BadRequestException('验证链接已过期，请重新发送验证邮件'),
      );
    });
  });
});
