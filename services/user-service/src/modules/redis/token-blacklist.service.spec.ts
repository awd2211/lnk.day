import { Test, TestingModule } from '@nestjs/testing';

import { TokenBlacklistService } from './token-blacklist.service';

// The actual injection token used by @InjectRedis()
const REDIS_INJECTION_TOKEN = 'default_IORedisModuleConnectionToken';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let mockRedis: any;

  const createMockRedis = () => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    setex: jest.fn().mockResolvedValue('OK'),
    exists: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
  });

  beforeEach(async () => {
    mockRedis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: REDIS_INJECTION_TOKEN,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToBlacklist', () => {
    it('should add token to Redis blacklist', async () => {
      await service.addToBlacklist('test-token');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'token:blacklist:test-token',
        expect.any(Number),
        '1',
      );
    });

    it('should use custom TTL when provided', async () => {
      await service.addToBlacklist('test-token', 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'token:blacklist:test-token',
        3600,
        '1',
      );
    });

    it('should use default TTL (30 days) when not provided', async () => {
      await service.addToBlacklist('test-token');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'token:blacklist:test-token',
        30 * 24 * 60 * 60, // 30 days in seconds
        '1',
      );
    });
  });

  describe('isBlacklisted', () => {
    it('should return true when token is blacklisted', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.isBlacklisted('blacklisted-token');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('token:blacklist:blacklisted-token');
    });

    it('should return false when token is not blacklisted', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.isBlacklisted('valid-token');

      expect(result).toBe(false);
    });
  });

  describe('removeFromBlacklist', () => {
    it('should remove token from Redis blacklist', async () => {
      await service.removeFromBlacklist('test-token');

      expect(mockRedis.del).toHaveBeenCalledWith('token:blacklist:test-token');
    });
  });

  describe('onModuleDestroy', () => {
    it('should handle cleanup without errors', async () => {
      // Should not throw
      await service.onModuleDestroy();
    });
  });

  describe('Redis error fallback', () => {
    it('should fall back to local cache when Redis setex fails', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Connection refused'));

      // Should not throw
      await service.addToBlacklist('fallback-token');
    });

    it('should fall back to local cache when Redis exists fails', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Connection refused'));

      const result = await service.isBlacklisted('test-token');

      // Local cache is empty, so should return false
      expect(result).toBe(false);
    });

    it('should fall back to local cache when Redis del fails', async () => {
      mockRedis.del.mockRejectedValue(new Error('Connection refused'));

      // Should not throw
      await service.removeFromBlacklist('test-token');
    });
  });

  describe('checkRedisConnection on startup', () => {
    it('should fall back to local cache when Redis ping fails on startup', async () => {
      const failingRedis = {
        ping: jest.fn().mockRejectedValue(new Error('Redis not available')),
        setex: jest.fn(),
        exists: jest.fn(),
        del: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TokenBlacklistService,
          {
            provide: REDIS_INJECTION_TOKEN,
            useValue: failingRedis,
          },
        ],
      }).compile();

      const serviceWithFailingRedis = module.get<TokenBlacklistService>(TokenBlacklistService);

      // Wait for async checkRedisConnection to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Service should use local cache, not Redis
      await serviceWithFailingRedis.addToBlacklist('test-token');
      const isBlacklisted = await serviceWithFailingRedis.isBlacklisted('test-token');

      // Should work with local cache
      expect(isBlacklisted).toBe(true);
      // Redis methods should not have been called after ping failed
      expect(failingRedis.setex).not.toHaveBeenCalled();
      expect(failingRedis.exists).not.toHaveBeenCalled();
    });
  });
});
