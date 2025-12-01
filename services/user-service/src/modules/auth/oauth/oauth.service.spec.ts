import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { OAuthService, OAuthUserInfo } from './oauth.service';
import { OAuthAccount, OAuthProvider } from './oauth-account.entity';
import { UserService } from '../../user/user.service';
import { createMockRepository } from '../../../../test/mocks';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OAuthService', () => {
  let service: OAuthService;
  let oauthRepository: ReturnType<typeof createMockRepository>;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUserService = {
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        APP_URL: 'https://app.lnk.day',
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: 'google-client-secret',
        GITHUB_CLIENT_ID: 'github-client-id',
        GITHUB_CLIENT_SECRET: 'github-client-secret',
        WECHAT_APP_ID: 'wechat-app-id',
        WECHAT_APP_SECRET: 'wechat-app-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '30d',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockOAuthAccount: OAuthAccount = {
    id: 'oauth-123',
    userId: 'user-123',
    provider: OAuthProvider.GOOGLE,
    providerAccountId: 'google-account-id',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://avatar.url',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenExpiresAt: new Date(Date.now() + 3600000),
    profile: { sub: 'google-account-id' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: null,
    password: 'hashed-password',
  };

  const mockOAuthUserInfo: OAuthUserInfo = {
    provider: OAuthProvider.GOOGLE,
    providerAccountId: 'google-account-id',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://avatar.url',
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    tokenExpiresAt: new Date(Date.now() + 3600000),
    profile: { sub: 'google-account-id' },
  };

  beforeEach(async () => {
    oauthRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: getRepositoryToken(OAuthAccount),
          useValue: oauthRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOAuthCallback', () => {
    it('should handle existing OAuth account', async () => {
      oauthRepository.findOne.mockResolvedValue({ ...mockOAuthAccount });
      oauthRepository.save.mockResolvedValue({ ...mockOAuthAccount });
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockUserService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.handleOAuthCallback(mockOAuthUserInfo);

      expect(oauthRepository.findOne).toHaveBeenCalledWith({
        where: {
          provider: OAuthProvider.GOOGLE,
          providerAccountId: 'google-account-id',
        },
      });
      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe('user-123');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should create new user when no existing OAuth account', async () => {
      oauthRepository.findOne.mockResolvedValue(null);
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);
      oauthRepository.create.mockReturnValue({ ...mockOAuthAccount });
      oauthRepository.save.mockResolvedValue({ ...mockOAuthAccount });
      mockUserService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.handleOAuthCallback(mockOAuthUserInfo);

      expect(mockUserService.create).toHaveBeenCalled();
      expect(result.isNewUser).toBe(true);
    });

    it('should link to existing user with same email', async () => {
      oauthRepository.findOne.mockResolvedValue(null);
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      oauthRepository.create.mockReturnValue({ ...mockOAuthAccount });
      oauthRepository.save.mockResolvedValue({ ...mockOAuthAccount });
      mockUserService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.handleOAuthCallback(mockOAuthUserInfo);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserService.create).not.toHaveBeenCalled();
      expect(result.isNewUser).toBe(false);
    });

    it('should create user without email', async () => {
      const oauthInfoWithoutEmail = { ...mockOAuthUserInfo, email: undefined };
      oauthRepository.findOne.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);
      oauthRepository.create.mockReturnValue({ ...mockOAuthAccount });
      oauthRepository.save.mockResolvedValue({ ...mockOAuthAccount });
      mockUserService.updateLastLogin.mockResolvedValue(undefined);

      await service.handleOAuthCallback(oauthInfoWithoutEmail);

      expect(mockUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringContaining('@oauth.local'),
        }),
      );
    });

    it('should use user avatar from OAuth if user has no avatar', async () => {
      const userWithoutAvatar = { ...mockUser, avatar: null };
      oauthRepository.findOne.mockResolvedValue({ ...mockOAuthAccount });
      oauthRepository.save.mockResolvedValue({ ...mockOAuthAccount });
      mockUserService.findOne.mockResolvedValue(userWithoutAvatar);
      mockUserService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.handleOAuthCallback(mockOAuthUserInfo);

      expect(result.user.avatar).toBe(mockOAuthUserInfo.avatar);
    });
  });

  describe('linkOAuthAccount', () => {
    it('should link OAuth account to user', async () => {
      oauthRepository.findOne.mockResolvedValue(null);
      oauthRepository.create.mockReturnValue({ ...mockOAuthAccount });
      oauthRepository.save.mockResolvedValue({ ...mockOAuthAccount });

      const result = await service.linkOAuthAccount('user-123', mockOAuthUserInfo);

      expect(oauthRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          provider: OAuthProvider.GOOGLE,
          providerAccountId: 'google-account-id',
        }),
      );
      expect(result.provider).toBe(OAuthProvider.GOOGLE);
    });

    it('should update existing link for same user', async () => {
      oauthRepository.findOne.mockResolvedValue({ ...mockOAuthAccount });
      oauthRepository.save.mockResolvedValue({ ...mockOAuthAccount });

      const result = await service.linkOAuthAccount('user-123', mockOAuthUserInfo);

      expect(oauthRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw if account linked to another user', async () => {
      oauthRepository.findOne.mockResolvedValue({
        ...mockOAuthAccount,
        userId: 'other-user',
      });

      await expect(
        service.linkOAuthAccount('user-123', mockOAuthUserInfo),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unlinkOAuthAccount', () => {
    it('should unlink OAuth account', async () => {
      oauthRepository.findOne.mockResolvedValue({ ...mockOAuthAccount });
      mockUserService.findOne.mockResolvedValue(mockUser);
      oauthRepository.count.mockResolvedValue(2);
      oauthRepository.remove.mockResolvedValue(mockOAuthAccount);

      await service.unlinkOAuthAccount('user-123', OAuthProvider.GOOGLE);

      expect(oauthRepository.remove).toHaveBeenCalled();
    });

    it('should throw if account not found', async () => {
      oauthRepository.findOne.mockResolvedValue(null);

      await expect(
        service.unlinkOAuthAccount('user-123', OAuthProvider.GOOGLE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if only login method and no password', async () => {
      oauthRepository.findOne.mockResolvedValue({ ...mockOAuthAccount });
      mockUserService.findOne.mockResolvedValue({ ...mockUser, password: null });
      oauthRepository.count.mockResolvedValue(1);

      await expect(
        service.unlinkOAuthAccount('user-123', OAuthProvider.GOOGLE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow unlink if user has password', async () => {
      oauthRepository.findOne.mockResolvedValue({ ...mockOAuthAccount });
      mockUserService.findOne.mockResolvedValue(mockUser);
      oauthRepository.count.mockResolvedValue(1);
      oauthRepository.remove.mockResolvedValue(mockOAuthAccount);

      await service.unlinkOAuthAccount('user-123', OAuthProvider.GOOGLE);

      expect(oauthRepository.remove).toHaveBeenCalled();
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return linked OAuth accounts', async () => {
      oauthRepository.find.mockResolvedValue([mockOAuthAccount]);

      const result = await service.getLinkedAccounts('user-123');

      expect(oauthRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: ['id', 'provider', 'email', 'name', 'avatar', 'createdAt'],
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no accounts', async () => {
      oauthRepository.find.mockResolvedValue([]);

      const result = await service.getLinkedAccounts('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getOAuthConfig', () => {
    it('should return Google OAuth config', async () => {
      const result = await service.getOAuthConfig(OAuthProvider.GOOGLE);

      expect(result.authUrl).toContain('accounts.google.com');
      expect(result.clientId).toBe('google-client-id');
      expect(result.scope).toContain('email');
      expect(result.state).toBeDefined();
    });

    it('should return GitHub OAuth config', async () => {
      const result = await service.getOAuthConfig(OAuthProvider.GITHUB);

      expect(result.authUrl).toContain('github.com');
      expect(result.clientId).toBe('github-client-id');
      expect(result.scope).toContain('email');
    });

    it('should return WeChat OAuth config', async () => {
      const result = await service.getOAuthConfig(OAuthProvider.WECHAT);

      expect(result.authUrl).toContain('weixin.qq.com');
      expect(result.clientId).toBe('wechat-app-id');
    });

    it('should throw for unsupported provider', async () => {
      await expect(
        service.getOAuthConfig('unsupported' as OAuthProvider),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange Google code for tokens', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'google-access-token',
              refresh_token: 'google-refresh-token',
              expires_in: 3600,
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              id: 'google-user-id',
              email: 'test@gmail.com',
              name: 'Test User',
              picture: 'https://avatar.url',
            }),
        });

      const result = await service.exchangeCodeForTokens(OAuthProvider.GOOGLE, 'auth-code');

      expect(result.provider).toBe(OAuthProvider.GOOGLE);
      expect(result.email).toBe('test@gmail.com');
      expect(result.accessToken).toBe('google-access-token');
    });

    it('should throw on Google error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            error: 'invalid_grant',
            error_description: 'Invalid code',
          }),
      });

      await expect(
        service.exchangeCodeForTokens(OAuthProvider.GOOGLE, 'invalid-code'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should exchange GitHub code for tokens', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'github-access-token',
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              id: 12345,
              email: 'test@github.com',
              name: 'Test User',
              login: 'testuser',
              avatar_url: 'https://avatar.github.com',
            }),
        });

      const result = await service.exchangeCodeForTokens(OAuthProvider.GITHUB, 'auth-code');

      expect(result.provider).toBe(OAuthProvider.GITHUB);
      expect(result.providerAccountId).toBe('12345');
      expect(result.accessToken).toBe('github-access-token');
    });

    it('should fetch GitHub email if not public', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'github-access-token',
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              id: 12345,
              name: 'Test User',
              login: 'testuser',
              avatar_url: 'https://avatar.github.com',
              // no email
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve([
              { email: 'secondary@github.com', primary: false },
              { email: 'primary@github.com', primary: true },
            ]),
        });

      const result = await service.exchangeCodeForTokens(OAuthProvider.GITHUB, 'auth-code');

      expect(result.email).toBe('primary@github.com');
    });

    it('should throw on GitHub error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            error: 'bad_verification_code',
            error_description: 'Invalid code',
          }),
      });

      await expect(
        service.exchangeCodeForTokens(OAuthProvider.GITHUB, 'invalid-code'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should exchange WeChat code for tokens', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'wechat-access-token',
              refresh_token: 'wechat-refresh-token',
              expires_in: 7200,
              openid: 'wechat-openid',
              unionid: 'wechat-unionid',
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              nickname: 'WeChat User',
              headimgurl: 'https://wechat.avatar.url',
            }),
        });

      const result = await service.exchangeCodeForTokens(OAuthProvider.WECHAT, 'auth-code');

      expect(result.provider).toBe(OAuthProvider.WECHAT);
      expect(result.providerAccountId).toBe('wechat-unionid');
      expect(result.name).toBe('WeChat User');
    });

    it('should throw on WeChat error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            errcode: 40029,
            errmsg: 'Invalid code',
          }),
      });

      await expect(
        service.exchangeCodeForTokens(OAuthProvider.WECHAT, 'invalid-code'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for unsupported provider', async () => {
      await expect(
        service.exchangeCodeForTokens('unsupported' as OAuthProvider, 'code'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
