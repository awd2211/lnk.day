import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from './jwt-auth.guard';

// Mock AuthGuard to avoid passport dependency
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(() => {
    return class MockAuthGuard {
      canActivate() {
        return true;
      }
    };
  }),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let configService: jest.Mocked<ConfigService>;
  let reflector: jest.Mocked<Reflector>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockExecutionContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const mockRequest = {
      headers,
      user: null as any,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
      getType: () => 'http',
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    configService = module.get(ConfigService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    describe('internal API key authentication', () => {
      it('should allow access with Bearer token matching internal API key', () => {
        mockConfigService.get.mockReturnValue('internal-secret-key');

        const context = createMockExecutionContext({
          authorization: 'Bearer internal-secret-key',
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);

        const request = context.switchToHttp().getRequest();
        expect(request.user).toEqual({
          sub: 'system',
          email: 'system@internal',
          role: 'INTERNAL',
        });
      });

      it('should allow access with x-internal-api-key header', () => {
        mockConfigService.get.mockReturnValue('internal-secret-key');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'internal-secret-key',
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);

        const request = context.switchToHttp().getRequest();
        expect(request.user).toEqual({
          sub: 'system',
          email: 'system@internal',
          role: 'INTERNAL',
        });
      });

      it('should fall through to parent guard when Bearer token does not match', () => {
        mockConfigService.get.mockReturnValue('internal-secret-key');

        const context = createMockExecutionContext({
          authorization: 'Bearer wrong-key',
        });

        // Should return true from mocked parent canActivate
        const result = guard.canActivate(context);

        expect(result).toBe(true);

        // User should not be set (parent guard would set it)
        const request = context.switchToHttp().getRequest();
        expect(request.user).toBeNull();
      });

      it('should fall through to parent guard when x-internal-api-key does not match', () => {
        mockConfigService.get.mockReturnValue('internal-secret-key');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'wrong-key',
        });

        // Should return true from mocked parent canActivate
        const result = guard.canActivate(context);

        expect(result).toBe(true);

        // User should not be set (parent guard would set it)
        const request = context.switchToHttp().getRequest();
        expect(request.user).toBeNull();
      });
    });

    describe('when internal API key is not configured', () => {
      it('should fall through to parent guard when no internal key configured', () => {
        mockConfigService.get.mockReturnValue(undefined);

        const context = createMockExecutionContext({
          authorization: 'Bearer some-jwt-token',
        });

        // Should delegate to parent AuthGuard
        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockConfigService.get).toHaveBeenCalledWith('INTERNAL_API_KEY');
      });

      it('should fall through to parent guard when internal key is empty string', () => {
        mockConfigService.get.mockReturnValue('');

        const context = createMockExecutionContext({
          authorization: 'Bearer some-jwt-token',
        });

        // Empty string is falsy, so should fall through
        const result = guard.canActivate(context);

        expect(result).toBe(true);

        // The user should not be set to system user
        const request = context.switchToHttp().getRequest();
        expect(request.user).toBeNull();
      });
    });

    describe('priority of authentication methods', () => {
      it('should check Bearer token before x-internal-api-key', () => {
        mockConfigService.get.mockReturnValue('internal-secret-key');

        const context = createMockExecutionContext({
          authorization: 'Bearer internal-secret-key',
          'x-internal-api-key': 'wrong-key',
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);

        const request = context.switchToHttp().getRequest();
        expect(request.user.role).toBe('INTERNAL');
      });

      it('should fall back to x-internal-api-key if Bearer does not match', () => {
        mockConfigService.get.mockReturnValue('internal-secret-key');

        const context = createMockExecutionContext({
          authorization: 'Bearer wrong-token',
          'x-internal-api-key': 'internal-secret-key',
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);

        const request = context.switchToHttp().getRequest();
        expect(request.user.role).toBe('INTERNAL');
      });
    });

    describe('user object structure', () => {
      it('should set correct user properties for internal requests', () => {
        mockConfigService.get.mockReturnValue('my-api-key');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'my-api-key',
        });

        guard.canActivate(context);

        const request = context.switchToHttp().getRequest();
        expect(request.user).toHaveProperty('sub', 'system');
        expect(request.user).toHaveProperty('email', 'system@internal');
        expect(request.user).toHaveProperty('role', 'INTERNAL');
      });
    });
  });
});
