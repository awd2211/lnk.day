import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy, JwtPayload, AuthenticatedUser } from './jwt.strategy';
import { UserService } from '../../user/user.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userService: jest.Mocked<UserService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    teamId: 'team-456',
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserService = {
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userService = module.get(UserService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not configured', async () => {
      const noSecretConfig = {
        get: jest.fn().mockReturnValue(undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            {
              provide: UserService,
              useValue: mockUserService,
            },
            {
              provide: ConfigService,
              useValue: noSecretConfig,
            },
          ],
        }).compile(),
      ).rejects.toThrow('JWT_SECRET environment variable is required');
    });
  });

  describe('validate', () => {
    describe('admin users', () => {
      it('should return admin user for SUPER_ADMIN role without database lookup', async () => {
        const payload: JwtPayload = {
          sub: 'admin-123',
          email: 'admin@example.com',
          role: 'SUPER_ADMIN',
        };

        const result = await strategy.validate(payload);

        expect(result).toEqual({
          id: 'admin-123',
          email: 'admin@example.com',
          teamRole: 'SUPER_ADMIN',
          permissions: [],
          isConsoleAdmin: true,
        });

        // Should not call userService.findOne for admin users
        expect(mockUserService.findOne).not.toHaveBeenCalled();
      });

      it('should return admin user for ADMIN role without database lookup', async () => {
        const payload: JwtPayload = {
          sub: 'admin-456',
          email: 'admin2@example.com',
          role: 'ADMIN',
        };

        const result = await strategy.validate(payload);

        expect(result.isConsoleAdmin).toBe(true);
        expect(result.teamRole).toBe('ADMIN');
        expect(mockUserService.findOne).not.toHaveBeenCalled();
      });

      it('should return admin user for OPERATOR role without database lookup', async () => {
        const payload: JwtPayload = {
          sub: 'operator-789',
          email: 'operator@example.com',
          role: 'OPERATOR',
        };

        const result = await strategy.validate(payload);

        expect(result.isConsoleAdmin).toBe(true);
        expect(result.teamRole).toBe('OPERATOR');
        expect(mockUserService.findOne).not.toHaveBeenCalled();
      });
    });

    describe('regular users', () => {
      it('should validate and return user from database', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          teamId: 'team-456',
          teamRole: 'OWNER',
          permissions: ['links:view', 'links:create'],
        };

        const result = await strategy.validate(payload);

        expect(result).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          teamId: 'team-456',
          teamRole: 'OWNER',
          permissions: ['links:view', 'links:create'],
        });

        expect(mockUserService.findOne).toHaveBeenCalledWith('user-123');
      });

      it('should throw UnauthorizedException if user not found', async () => {
        mockUserService.findOne.mockResolvedValue(null);

        const payload: JwtPayload = {
          sub: 'nonexistent-user',
          email: 'notfound@example.com',
        };

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      });

      it('should use payload teamId if provided', async () => {
        mockUserService.findOne.mockResolvedValue({
          ...mockUser,
          teamId: 'user-default-team',
        });

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          teamId: 'payload-team-id',
        };

        const result = await strategy.validate(payload);

        expect(result.teamId).toBe('payload-team-id');
      });

      it('should fall back to user teamId if payload has none', async () => {
        mockUserService.findOne.mockResolvedValue({
          ...mockUser,
          teamId: 'user-default-team',
        });

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
        };

        const result = await strategy.validate(payload);

        expect(result.teamId).toBe('user-default-team');
      });

      it('should use empty permissions array if not in payload', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
        };

        const result = await strategy.validate(payload);

        expect(result.permissions).toEqual([]);
      });

      it('should use permissions from payload if provided', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          permissions: ['admin:users:view', 'admin:users:manage'],
        };

        const result = await strategy.validate(payload);

        expect(result.permissions).toEqual(['admin:users:view', 'admin:users:manage']);
      });

      it('should set teamRole to undefined if not in payload', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
        };

        const result = await strategy.validate(payload);

        expect(result.teamRole).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle user without name', async () => {
        mockUserService.findOne.mockResolvedValue({
          ...mockUser,
          name: undefined,
        });

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
        };

        const result = await strategy.validate(payload);

        expect(result.name).toBeUndefined();
      });

      it('should not treat regular roles as admin', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'USER', // Not an admin role
        };

        const result = await strategy.validate(payload);

        expect(result.isConsoleAdmin).toBeUndefined();
        expect(mockUserService.findOne).toHaveBeenCalled();
      });

      it('should handle payload with iat and exp', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const result = await strategy.validate(payload);

        expect(result.id).toBe('user-123');
      });
    });
  });
});
