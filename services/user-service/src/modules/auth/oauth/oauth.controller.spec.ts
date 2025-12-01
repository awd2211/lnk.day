import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { OAuthProvider } from './oauth-account.entity';

describe('OAuthController', () => {
  let controller: OAuthController;
  let oauthService: jest.Mocked<OAuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockOAuthService = {
    getOAuthConfig: jest.fn(),
    exchangeCodeForTokens: jest.fn(),
    handleOAuthCallback: jest.fn(),
    getLinkedAccounts: jest.fn(),
    linkOAuthAccount: jest.fn(),
    unlinkOAuthAccount: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        GOOGLE_CLIENT_ID: 'google-client-id',
        GITHUB_CLIENT_ID: 'github-client-id',
        WECHAT_APP_ID: 'wechat-app-id',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockUser = {
    sub: 'user-123',
    email: 'test@example.com',
    type: 'user',
    scope: { level: 'personal', teamId: 'user-123' },
  };

  const mockOAuthConfig = {
    authUrl: 'https://accounts.google.com/oauth2/...',
    clientId: 'google-client-id',
    scope: 'openid email profile',
    state: 'random-state',
  };

  const mockOAuthUserInfo = {
    provider: OAuthProvider.GOOGLE,
    providerAccountId: 'google-account-id',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://avatar.url',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  const mockOAuthAccount = {
    id: 'oauth-123',
    userId: 'user-123',
    provider: OAuthProvider.GOOGLE,
    providerAccountId: 'google-account-id',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://avatar.url',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        {
          provide: OAuthService,
          useValue: mockOAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<OAuthController>(OAuthController);
    oauthService = module.get(OAuthService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProviders', () => {
    it('should return all enabled providers', () => {
      const result = controller.getProviders();

      expect(result.providers).toHaveLength(3);
      expect(result.providers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ provider: OAuthProvider.GOOGLE }),
          expect.objectContaining({ provider: OAuthProvider.GITHUB }),
          expect.objectContaining({ provider: OAuthProvider.WECHAT }),
        ]),
      );
    });

    it('should only return configured providers', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'google-client-id';
        return undefined;
      });

      const result = controller.getProviders();

      expect(result.providers).toHaveLength(1);
      expect(result.providers[0].provider).toBe(OAuthProvider.GOOGLE);
    });

    it('should return empty array if no providers configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = controller.getProviders();

      expect(result.providers).toHaveLength(0);
    });
  });

  describe('getAuthUrl', () => {
    it('should return OAuth config for provider', async () => {
      mockOAuthService.getOAuthConfig.mockResolvedValue(mockOAuthConfig);

      const result = await controller.getAuthUrl(OAuthProvider.GOOGLE);

      expect(oauthService.getOAuthConfig).toHaveBeenCalledWith(OAuthProvider.GOOGLE);
      expect(result.authUrl).toBeDefined();
      expect(result.clientId).toBeDefined();
      expect(result.state).toBeDefined();
    });
  });

  describe('redirect', () => {
    it('should redirect to OAuth provider', async () => {
      mockOAuthService.getOAuthConfig.mockResolvedValue(mockOAuthConfig);
      const mockResponse = {
        redirect: jest.fn(),
      };

      await controller.redirect(OAuthProvider.GOOGLE, mockResponse as any);

      expect(mockResponse.redirect).toHaveBeenCalledWith(mockOAuthConfig.authUrl);
    });
  });

  describe('callback', () => {
    it('should handle successful OAuth callback', async () => {
      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthUserInfo);
      mockOAuthService.handleOAuthCallback.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        isNewUser: false,
      });

      const mockResponse = {
        redirect: jest.fn(),
      };

      await controller.callback(
        OAuthProvider.GOOGLE,
        'auth-code',
        'state',
        mockResponse as any,
      );

      expect(oauthService.exchangeCodeForTokens).toHaveBeenCalledWith(
        OAuthProvider.GOOGLE,
        'auth-code',
      );
      expect(oauthService.handleOAuthCallback).toHaveBeenCalledWith(mockOAuthUserInfo);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/callback'),
      );
    });

    it('should redirect with isNewUser=true for new users', async () => {
      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthUserInfo);
      mockOAuthService.handleOAuthCallback.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        isNewUser: true,
      });

      const mockResponse = {
        redirect: jest.fn(),
      };

      await controller.callback(
        OAuthProvider.GOOGLE,
        'auth-code',
        'state',
        mockResponse as any,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('isNewUser=true'),
      );
    });

    it('should redirect to error page on failure', async () => {
      mockOAuthService.exchangeCodeForTokens.mockRejectedValue(
        new Error('Invalid authorization code'),
      );

      const mockResponse = {
        redirect: jest.fn(),
      };

      await controller.callback(
        OAuthProvider.GOOGLE,
        'invalid-code',
        'state',
        mockResponse as any,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });
  });

  describe('exchangeToken', () => {
    it('should exchange token for mobile/SPA clients', async () => {
      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthUserInfo);
      mockOAuthService.handleOAuthCallback.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        isNewUser: false,
      });

      const result = await controller.exchangeToken(OAuthProvider.GOOGLE, 'auth-code');

      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.refreshToken).toBe('jwt-refresh-token');
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return linked OAuth accounts', async () => {
      mockOAuthService.getLinkedAccounts.mockResolvedValue([mockOAuthAccount]);

      const result = await controller.getLinkedAccounts(mockUser as any);

      expect(oauthService.getLinkedAccounts).toHaveBeenCalledWith('user-123');
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].provider).toBe(OAuthProvider.GOOGLE);
    });

    it('should return empty array if no accounts linked', async () => {
      mockOAuthService.getLinkedAccounts.mockResolvedValue([]);

      const result = await controller.getLinkedAccounts(mockUser as any);

      expect(result.accounts).toHaveLength(0);
    });
  });

  describe('linkAccount', () => {
    it('should link OAuth account to user', async () => {
      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthUserInfo);
      mockOAuthService.linkOAuthAccount.mockResolvedValue(mockOAuthAccount);

      const result = await controller.linkAccount(
        OAuthProvider.GOOGLE,
        'auth-code',
        mockUser as any,
      );

      expect(oauthService.exchangeCodeForTokens).toHaveBeenCalledWith(
        OAuthProvider.GOOGLE,
        'auth-code',
      );
      expect(oauthService.linkOAuthAccount).toHaveBeenCalledWith('user-123', mockOAuthUserInfo);
      expect(result.message).toContain('linked successfully');
      expect(result.account.provider).toBe(OAuthProvider.GOOGLE);
    });
  });

  describe('unlinkAccount', () => {
    it('should unlink OAuth account from user', async () => {
      mockOAuthService.unlinkOAuthAccount.mockResolvedValue(undefined);

      const result = await controller.unlinkAccount(OAuthProvider.GOOGLE, mockUser as any);

      expect(oauthService.unlinkOAuthAccount).toHaveBeenCalledWith('user-123', OAuthProvider.GOOGLE);
      expect(result.message).toContain('unlinked successfully');
    });
  });
});
