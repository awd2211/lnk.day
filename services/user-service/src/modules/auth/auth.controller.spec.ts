import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should register a new user', async () => {
      const expectedResult = {
        user: { id: 'user-123', email: registerDto.email, name: registerDto.name },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      const expectedResult = {
        user: { id: 'user-123', email: loginDto.email, name: 'Test User' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto = {
      refreshToken: 'refresh-token-123',
    };

    it('should refresh tokens', async () => {
      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      };
      mockAuthService.refreshTokens.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshTokens).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout', () => {
    it('should logout user with bearer token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer access-token-123',
        },
      } as Request;

      const result = await controller.logout(mockRequest);

      expect(authService.logout).toHaveBeenCalledWith('access-token-123');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle logout without authorization header', async () => {
      const mockRequest = {
        headers: {},
      } as Request;

      const result = await controller.logout(mockRequest);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getMe', () => {
    it('should return current user info', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        role: 'USER',
        teamId: null,
        createdAt: new Date('2024-01-01'),
      };

      const result = controller.getMe(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        avatar: mockUser.avatar,
        role: mockUser.role,
        teamId: mockUser.teamId,
        createdAt: mockUser.createdAt,
      });
    });

    it('should return user info with teamId', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        role: 'USER',
        teamId: 'team-456',
        createdAt: new Date('2024-01-01'),
      };

      const result = controller.getMe(mockUser);

      expect(result.teamId).toBe('team-456');
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send password reset email', async () => {
      const expectedResult = { message: '如果该邮箱已注册，您将收到密码重置邮件' };
      mockAuthService.forgotPassword.mockResolvedValue(expectedResult);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto.email);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'reset-token-123',
      newPassword: 'newPassword123',
    };

    it('should reset password', async () => {
      const expectedResult = { message: '密码重置成功' };
      mockAuthService.resetPassword.mockResolvedValue(expectedResult);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
