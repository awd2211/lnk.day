import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { TeamService } from '../team/team.service';
import { EmailService } from '../email/email.service';
import { TokenBlacklistService } from '../redis/token-blacklist.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import {
  createMockRepository,
  createMockJwtService,
  createMockConfigService,
  createMockEmailService,
  createMockTokenBlacklistService,
  createMockUserService,
  createMockTeamService,
} from '../../../test/mocks';

describe('AuthService', () => {
  let service: AuthService;
  let userService: ReturnType<typeof createMockUserService>;
  let teamService: ReturnType<typeof createMockTeamService>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let configService: ReturnType<typeof createMockConfigService>;
  let emailService: ReturnType<typeof createMockEmailService>;
  let tokenBlacklistService: ReturnType<typeof createMockTokenBlacklistService>;
  let passwordResetTokenRepository: ReturnType<typeof createMockRepository>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: '$2b$10$hashedpassword', // bcrypt hash
    teamId: null,
    role: 'USER',
    failedLoginAttempts: 0,
    lockUntil: null,
  };

  beforeEach(async () => {
    userService = createMockUserService();
    teamService = createMockTeamService();
    jwtService = createMockJwtService();
    configService = createMockConfigService();
    emailService = createMockEmailService();
    tokenBlacklistService = createMockTokenBlacklistService();
    passwordResetTokenRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: TeamService, useValue: teamService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailService, useValue: emailService },
        { provide: TokenBlacklistService, useValue: tokenBlacklistService },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: passwordResetTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should register a new user and return tokens', async () => {
      const createdUser = { id: 'new-user-id', ...registerDto };
      userService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(userService.create).toHaveBeenCalledWith(registerDto);
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.name,
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should generate tokens with OWNER permissions for personal workspace', async () => {
      const createdUser = { id: 'new-user-id', ...registerDto, teamId: null };
      userService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(jwtService.sign).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-jwt-token');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('should login successfully with valid credentials', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.isAccountLocked.mockReturnValue(false);

      const result = await service.login(loginDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(userService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException if account is locked', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.isAccountLocked.mockReturnValue(true);
      userService.getRemainingLockTime.mockReturnValue(15);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException and record failed login on wrong password', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.isAccountLocked.mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      userService.recordFailedLogin.mockResolvedValue({
        locked: false,
        remainingAttempts: 4,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userService.recordFailedLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should lock account after too many failed attempts', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.isAccountLocked.mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      userService.recordFailedLogin.mockResolvedValue({
        locked: true,
        lockMinutes: 30,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        /账户已锁定/,
      );
    });

    it('should generate tokens with team permissions when user has teamId', async () => {
      const userWithTeam = { ...mockUser, teamId: 'team-123' };
      userService.findByEmail.mockResolvedValue(userWithTeam);
      userService.isAccountLocked.mockReturnValue(false);
      teamService.getUserTeamMembership.mockResolvedValue({
        teamRole: 'ADMIN',
        permissions: ['links:view', 'links:create', 'links:edit'],
      });

      const result = await service.login(loginDto);

      expect(teamService.getUserTeamMembership).toHaveBeenCalledWith(
        userWithTeam.id,
        userWithTeam.teamId,
      );
      expect(result.user.teamId).toBe('team-123');
    });
  });

  describe('refreshTokens', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh tokens successfully', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      jwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      userService.findOne.mockResolvedValue(mockUser);

      const result = await service.refreshTokens(refreshToken);

      expect(tokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(refreshToken);
      expect(tokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(refreshToken);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if token is blacklisted', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(true);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Token has been revoked'),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      jwtService.verify.mockReturnValue({ sub: 'non-existent', email: 'test@test.com' });
      userService.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('logout', () => {
    it('should add token to blacklist', async () => {
      const token = 'access-token';

      await service.logout(token);

      expect(tokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(token);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(true);

      const result = await service.isTokenBlacklisted('some-token');

      expect(result).toBe(true);
    });

    it('should return false if token is not blacklisted', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      const result = await service.isTokenBlacklisted('some-token');

      expect(result).toBe(false);
    });
  });

  describe('validateToken', () => {
    const token = 'valid-token';

    it('should validate token and return user info', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      userService.findOne.mockResolvedValue(mockUser);

      const result = await service.validateToken(token);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        teamId: mockUser.teamId,
      });
    });

    it('should throw UnauthorizedException if token is blacklisted', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(true);

      await expect(service.validateToken(token)).rejects.toThrow(
        new UnauthorizedException('Token has been revoked'),
      );
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      tokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid');
      });

      await expect(service.validateToken(token)).rejects.toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      passwordResetTokenRepository.save.mockResolvedValue({ id: 'token-id' });

      const result = await service.forgotPassword(mockUser.email);

      expect(passwordResetTokenRepository.delete).toHaveBeenCalledWith({
        userId: mockUser.id,
      });
      expect(passwordResetTokenRepository.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(String),
      );
      expect(result.message).toBeDefined();
    });

    it('should return success message even if user does not exist (prevent enumeration)', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toBe('如果该邮箱已注册，您将收到密码重置邮件');
    });

    it('should return resetToken in development environment', async () => {
      const devConfigService = createMockConfigService({ NODE_ENV: 'development' });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: UserService, useValue: userService },
          { provide: TeamService, useValue: teamService },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: devConfigService },
          { provide: EmailService, useValue: emailService },
          { provide: TokenBlacklistService, useValue: tokenBlacklistService },
          {
            provide: getRepositoryToken(PasswordResetToken),
            useValue: passwordResetTokenRepository,
          },
        ],
      }).compile();

      const devService = module.get<AuthService>(AuthService);
      userService.findByEmail.mockResolvedValue(mockUser);

      const result = await devService.forgotPassword(mockUser.email);

      expect(result).toHaveProperty('resetToken');
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token';
    const newPassword = 'newPassword123';

    it('should reset password with valid token', async () => {
      const tokenEntity = {
        id: 'token-id',
        userId: mockUser.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 3600000),
      };
      passwordResetTokenRepository.findOne.mockResolvedValue(tokenEntity);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword(resetToken, newPassword);

      expect(userService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        'new-hashed-password',
      );
      expect(passwordResetTokenRepository.remove).toHaveBeenCalledWith(tokenEntity);
      expect(result.message).toBe('密码重置成功');
    });

    it('should throw BadRequestException if token is invalid or expired', async () => {
      passwordResetTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(resetToken, newPassword)).rejects.toThrow(
        new BadRequestException('重置链接无效或已过期'),
      );
    });
  });
});
