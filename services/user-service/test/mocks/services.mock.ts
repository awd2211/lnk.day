import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JwtService Mock
 */
export function createMockJwtService(): jest.Mocked<JwtService> {
  return {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({
      sub: 'test-user-id',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    verifyAsync: jest.fn().mockResolvedValue({
      sub: 'test-user-id',
      email: 'test@example.com',
    }),
    decode: jest.fn().mockReturnValue({
      sub: 'test-user-id',
      email: 'test@example.com',
    }),
  } as unknown as jest.Mocked<JwtService>;
}

/**
 * ConfigService Mock
 */
export function createMockConfigService(config: Record<string, any> = {}): jest.Mocked<ConfigService> {
  const defaultConfig: Record<string, any> = {
    JWT_SECRET: 'test-jwt-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '30d',
    NODE_ENV: 'test',
    ...config,
  };

  return {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      return defaultConfig[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (!(key in defaultConfig)) {
        throw new Error(`Config key "${key}" not found`);
      }
      return defaultConfig[key];
    }),
  } as unknown as jest.Mocked<ConfigService>;
}

/**
 * EmailService Mock
 */
export function createMockEmailService() {
  return {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
    sendTeamInvitationEmail: jest.fn().mockResolvedValue(undefined),
    sendInvitationAcceptedEmail: jest.fn().mockResolvedValue(undefined),
    sendTwoFactorEmail: jest.fn().mockResolvedValue(undefined),
    sendSecurityAlertEmail: jest.fn().mockResolvedValue(undefined),
    sendRemovedFromTeamEmail: jest.fn().mockResolvedValue(undefined),
    sendRoleChangedEmail: jest.fn().mockResolvedValue(undefined),
    sendDataExportReadyEmail: jest.fn().mockResolvedValue(undefined),
    sendPrivacyRequestEmail: jest.fn().mockResolvedValue(undefined),
    sendAccountDeletionWarningEmail: jest.fn().mockResolvedValue(undefined),
    sendAccountDeletedEmail: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * TokenBlacklistService Mock
 */
export function createMockTokenBlacklistService() {
  const blacklist = new Set<string>();

  return {
    addToBlacklist: jest.fn().mockImplementation(async (token: string) => {
      blacklist.add(token);
    }),
    isBlacklisted: jest.fn().mockImplementation(async (token: string) => {
      return blacklist.has(token);
    }),
    removeFromBlacklist: jest.fn().mockImplementation(async (token: string) => {
      blacklist.delete(token);
    }),
    // 测试辅助方法
    _clear: () => blacklist.clear(),
    _getBlacklist: () => blacklist,
  };
}

/**
 * UserService Mock
 */
export function createMockUserService() {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updatePassword: jest.fn(),
    updateLastLogin: jest.fn(),
    recordFailedLogin: jest.fn(),
    isAccountLocked: jest.fn().mockReturnValue(false),
    getRemainingLockTime: jest.fn().mockReturnValue(0),
  };
}

/**
 * TeamService Mock
 */
export function createMockTeamService() {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    getUserTeamMembership: jest.fn().mockResolvedValue({
      teamRole: 'MEMBER',
      permissions: ['links:view', 'links:create'],
    }),
    getTeamMembers: jest.fn(),
  };
}
