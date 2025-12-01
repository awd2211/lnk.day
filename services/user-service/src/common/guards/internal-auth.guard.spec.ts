import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { InternalAuthGuard } from './internal-auth.guard';

describe('InternalAuthGuard', () => {
  let guard: InternalAuthGuard;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const createMockExecutionContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const mockRequest = {
      headers,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalAuthGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<InternalAuthGuard>(InternalAuthGuard);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    describe('valid authentication', () => {
      it('should return true when x-internal-api-key matches', () => {
        mockConfigService.get.mockReturnValue('valid-internal-key');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'valid-internal-key',
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true for any matching key value', () => {
        const testKey = 'my-secret-api-key-123';
        mockConfigService.get.mockReturnValue(testKey);

        const context = createMockExecutionContext({
          'x-internal-api-key': testKey,
        });

        expect(guard.canActivate(context)).toBe(true);
      });
    });

    describe('missing configuration', () => {
      it('should throw UnauthorizedException when INTERNAL_API_KEY is not configured', () => {
        mockConfigService.get.mockReturnValue(undefined);

        const context = createMockExecutionContext({
          'x-internal-api-key': 'some-key',
        });

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
        expect(() => guard.canActivate(context)).toThrow('Internal API not configured');
      });

      it('should throw UnauthorizedException when INTERNAL_API_KEY is empty string', () => {
        mockConfigService.get.mockReturnValue('');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'some-key',
        });

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
        expect(() => guard.canActivate(context)).toThrow('Internal API not configured');
      });

      it('should throw UnauthorizedException when INTERNAL_API_KEY is null', () => {
        mockConfigService.get.mockReturnValue(null);

        const context = createMockExecutionContext({
          'x-internal-api-key': 'some-key',
        });

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      });
    });

    describe('invalid key', () => {
      it('should throw UnauthorizedException when key does not match', () => {
        mockConfigService.get.mockReturnValue('correct-key');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'wrong-key',
        });

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
        expect(() => guard.canActivate(context)).toThrow('Invalid internal API key');
      });

      it('should throw UnauthorizedException when x-internal-api-key header is missing', () => {
        mockConfigService.get.mockReturnValue('correct-key');

        const context = createMockExecutionContext({});

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
        expect(() => guard.canActivate(context)).toThrow('Invalid internal API key');
      });

      it('should throw UnauthorizedException when x-internal-api-key header is undefined', () => {
        mockConfigService.get.mockReturnValue('correct-key');

        const context = createMockExecutionContext({
          'x-internal-api-key': undefined as any,
        });

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when x-internal-api-key header is empty', () => {
        mockConfigService.get.mockReturnValue('correct-key');

        const context = createMockExecutionContext({
          'x-internal-api-key': '',
        });

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      });
    });

    describe('case sensitivity', () => {
      it('should be case sensitive for key comparison', () => {
        mockConfigService.get.mockReturnValue('MySecretKey');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'mysecretkey', // lowercase
        });

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      });

      it('should match exact key including case', () => {
        mockConfigService.get.mockReturnValue('MySecretKey123');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'MySecretKey123',
        });

        expect(guard.canActivate(context)).toBe(true);
      });
    });

    describe('config service interaction', () => {
      it('should call configService.get with INTERNAL_API_KEY', () => {
        mockConfigService.get.mockReturnValue('test-key');

        const context = createMockExecutionContext({
          'x-internal-api-key': 'test-key',
        });

        guard.canActivate(context);

        expect(mockConfigService.get).toHaveBeenCalledWith('INTERNAL_API_KEY');
      });
    });
  });
});
