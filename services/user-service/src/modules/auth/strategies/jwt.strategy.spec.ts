import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UnifiedJwtPayload, AuthenticatedUser } from '@lnk/nestjs-common';

import { JwtStrategy } from './jwt.strategy';
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
        const payload: UnifiedJwtPayload = {
          sub: 'admin-123',
          email: 'admin@example.com',
          type: 'admin',
          scope: { level: 'platform' },
          role: 'SUPER_ADMIN',
        };

        const result = await strategy.validate(payload);

        expect(result.id).toBe('admin-123');
        expect(result.email).toBe('admin@example.com');
        expect(result.type).toBe('admin');
        expect(result.role).toBe('SUPER_ADMIN');
        expect(result.scope).toEqual({ level: 'platform' });

        // Should not call userService.findOne for admin users
        expect(mockUserService.findOne).not.toHaveBeenCalled();
      });

      it('should return admin user for ADMIN role without database lookup', async () => {
        const payload: UnifiedJwtPayload = {
          sub: 'admin-456',
          email: 'admin2@example.com',
          type: 'admin',
          scope: { level: 'platform' },
          role: 'ADMIN',
        };

        const result = await strategy.validate(payload);

        expect(result.type).toBe('admin');
        expect(result.role).toBe('ADMIN');
        expect(mockUserService.findOne).not.toHaveBeenCalled();
      });

      it('should return admin user for OPERATOR role without database lookup', async () => {
        const payload: UnifiedJwtPayload = {
          sub: 'operator-789',
          email: 'operator@example.com',
          type: 'admin',
          scope: { level: 'platform' },
          role: 'OPERATOR',
        };

        const result = await strategy.validate(payload);

        expect(result.type).toBe('admin');
        expect(result.role).toBe('OPERATOR');
        expect(mockUserService.findOne).not.toHaveBeenCalled();
      });
    });

    describe('regular users', () => {
      it('should validate and return user from database', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: UnifiedJwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          type: 'user',
          scope: { level: 'team', teamId: 'team-456' },
          role: 'OWNER',
        };

        const result = await strategy.validate(payload);

        expect(result.id).toBe('user-123');
        expect(result.email).toBe('test@example.com');
        expect(result.name).toBe('Test User');
        expect(result.type).toBe('user');
        expect(result.role).toBe('OWNER');
        expect(result.scope).toEqual({ level: 'team', teamId: 'team-456' });

        expect(mockUserService.findOne).toHaveBeenCalledWith('user-123');
      });

      it('should throw UnauthorizedException if user not found', async () => {
        mockUserService.findOne.mockResolvedValue(null);

        const payload: UnifiedJwtPayload = {
          sub: 'nonexistent-user',
          email: 'notfound@example.com',
          type: 'user',
          scope: { level: 'personal', teamId: 'nonexistent-user' },
          role: 'OWNER',
        };

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      });

      it('should preserve scope from payload', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: UnifiedJwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          type: 'user',
          scope: { level: 'personal', teamId: 'user-123' },
          role: 'OWNER',
        };

        const result = await strategy.validate(payload);

        expect(result.scope).toEqual({ level: 'personal', teamId: 'user-123' });
      });

      it('should use user name from database', async () => {
        mockUserService.findOne.mockResolvedValue({
          ...mockUser,
          name: 'Database Name',
        });

        const payload: UnifiedJwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          type: 'user',
          scope: { level: 'personal', teamId: 'user-123' },
          role: 'MEMBER',
        };

        const result = await strategy.validate(payload);

        expect(result.name).toBe('Database Name');
      });
    });

    describe('edge cases', () => {
      it('should handle user without name', async () => {
        mockUserService.findOne.mockResolvedValue({
          ...mockUser,
          name: undefined,
        });

        const payload: UnifiedJwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          type: 'user',
          scope: { level: 'personal', teamId: 'user-123' },
          role: 'MEMBER',
        };

        const result = await strategy.validate(payload);

        expect(result.name).toBeUndefined();
      });

      it('should not treat regular user roles as admin', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: UnifiedJwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          type: 'user',
          scope: { level: 'team', teamId: 'team-456' },
          role: 'OWNER',
        };

        const result = await strategy.validate(payload);

        expect(result.type).toBe('user');
        expect(mockUserService.findOne).toHaveBeenCalled();
      });

      it('should handle payload with iat and exp', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: UnifiedJwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          type: 'user',
          scope: { level: 'personal', teamId: 'user-123' },
          role: 'OWNER',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const result = await strategy.validate(payload);

        expect(result.id).toBe('user-123');
      });

      it('should handle VIEWER role', async () => {
        mockUserService.findOne.mockResolvedValue(mockUser);

        const payload: UnifiedJwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          type: 'user',
          scope: { level: 'team', teamId: 'team-456' },
          role: 'VIEWER',
        };

        const result = await strategy.validate(payload);

        expect(result.role).toBe('VIEWER');
      });
    });
  });
});
