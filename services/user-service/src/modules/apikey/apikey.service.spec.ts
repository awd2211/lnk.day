import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import { ApiKeyService } from './apikey.service';
import { ApiKey, ApiKeyScope } from './apikey.entity';
import { createMockRepository } from '../../../test/mocks';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apiKeyRepository: ReturnType<typeof createMockRepository>;

  const mockApiKey = {
    id: 'apikey-123',
    name: 'Test API Key',
    keyHash: 'hashed-key',
    keyPrefix: 'lnk_abc12345',
    userId: 'user-123',
    teamId: 'team-123',
    scopes: [ApiKeyScope.READ, ApiKeyScope.WRITE],
    isActive: true,
    usageCount: 5,
    lastUsedAt: new Date(),
    allowedIps: [],
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    apiKeyRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: apiKeyRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  describe('create', () => {
    it('should create an API key and return plain key', async () => {
      apiKeyRepository.create.mockReturnValue({ ...mockApiKey });
      apiKeyRepository.save.mockResolvedValue({ ...mockApiKey });

      const result = await service.create('Test Key', 'user-123', 'team-123', {
        scopes: [ApiKeyScope.READ],
      });

      expect(result.apiKey).toBeDefined();
      expect(result.plainKey).toBeDefined();
      expect(result.plainKey.startsWith('lnk_')).toBe(true);
    });

    it('should create API key with default READ scope', async () => {
      apiKeyRepository.create.mockReturnValue({ ...mockApiKey });
      apiKeyRepository.save.mockResolvedValue({ ...mockApiKey });

      await service.create('Test Key', 'user-123', 'team-123');

      expect(apiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: [ApiKeyScope.READ],
        }),
      );
    });

    it('should create API key with expiration date', async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      apiKeyRepository.create.mockReturnValue({ ...mockApiKey });
      apiKeyRepository.save.mockResolvedValue({ ...mockApiKey });

      await service.create('Test Key', 'user-123', 'team-123', { expiresAt });

      expect(apiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all API keys for a team', async () => {
      apiKeyRepository.find.mockResolvedValue([mockApiKey]);

      const result = await service.findAll('team-123');

      expect(apiKeyRepository.find).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return an API key by id', async () => {
      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      const result = await service.findOne('apikey-123');

      expect(result.id).toBe('apikey-123');
    });

    it('should throw NotFoundException if not found', async () => {
      apiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateKey', () => {
    it('should validate a valid key', async () => {
      apiKeyRepository.findOne.mockResolvedValue({ ...mockApiKey });
      apiKeyRepository.save.mockResolvedValue({ ...mockApiKey });

      const result = await service.validateKey('lnk_validkey123');

      expect(result.id).toBe('apikey-123');
      expect(apiKeyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          usageCount: 6, // incremented
        }),
      );
    });

    it('should throw UnauthorizedException for invalid key', async () => {
      apiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.validateKey('invalid-key')).rejects.toThrow(
        new UnauthorizedException('Invalid API key'),
      );
    });

    it('should throw UnauthorizedException for expired key', async () => {
      const expiredKey = {
        ...mockApiKey,
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
      };
      apiKeyRepository.findOne.mockResolvedValue(expiredKey);

      await expect(service.validateKey('lnk_expiredkey')).rejects.toThrow(
        new UnauthorizedException('API key has expired'),
      );
    });

    it('should throw UnauthorizedException for insufficient scope', async () => {
      const readOnlyKey = { ...mockApiKey, scopes: [ApiKeyScope.READ] };
      apiKeyRepository.findOne.mockResolvedValue(readOnlyKey);

      await expect(
        service.validateKey('lnk_readonly', ApiKeyScope.WRITE),
      ).rejects.toThrow(new UnauthorizedException('Insufficient API key scope'));
    });

    it('should allow ADMIN scope to bypass scope check', async () => {
      const adminKey = { ...mockApiKey, scopes: [ApiKeyScope.ADMIN] };
      apiKeyRepository.findOne.mockResolvedValue(adminKey);
      apiKeyRepository.save.mockResolvedValue(adminKey);

      const result = await service.validateKey('lnk_adminkey', ApiKeyScope.WRITE);

      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedException for IP not in allowlist', async () => {
      const restrictedKey = { ...mockApiKey, allowedIps: ['192.168.1.1'] };
      apiKeyRepository.findOne.mockResolvedValue(restrictedKey);

      await expect(
        service.validateKey('lnk_restricted', undefined, '192.168.1.100'),
      ).rejects.toThrow(new UnauthorizedException('IP not allowed for this API key'));
    });

    it('should allow IP in allowlist', async () => {
      const restrictedKey = { ...mockApiKey, allowedIps: ['192.168.1.1'] };
      apiKeyRepository.findOne.mockResolvedValue(restrictedKey);
      apiKeyRepository.save.mockResolvedValue(restrictedKey);

      const result = await service.validateKey('lnk_restricted', undefined, '192.168.1.1');

      expect(result).toBeDefined();
    });
  });

  describe('revoke', () => {
    it('should revoke an API key', async () => {
      apiKeyRepository.findOne.mockResolvedValue({ ...mockApiKey });
      apiKeyRepository.save.mockResolvedValue({ ...mockApiKey, isActive: false });

      const result = await service.revoke('apikey-123');

      expect(apiKeyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('update', () => {
    it('should update an API key', async () => {
      apiKeyRepository.findOne.mockResolvedValue({ ...mockApiKey });
      apiKeyRepository.save.mockResolvedValue({ ...mockApiKey, name: 'Updated Name' });

      const result = await service.update('apikey-123', { name: 'Updated Name' });

      expect(apiKeyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name' }),
      );
    });
  });

  describe('delete', () => {
    it('should delete an API key', async () => {
      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      await service.delete('apikey-123');

      expect(apiKeyRepository.remove).toHaveBeenCalledWith(mockApiKey);
    });
  });

  describe('regenerate', () => {
    it('should regenerate an API key', async () => {
      apiKeyRepository.findOne.mockResolvedValue({ ...mockApiKey });
      apiKeyRepository.save.mockResolvedValue({ ...mockApiKey, usageCount: 0 });

      const result = await service.regenerate('apikey-123');

      expect(result.plainKey).toBeDefined();
      expect(result.plainKey.startsWith('lnk_')).toBe(true);
      expect(apiKeyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          usageCount: 0,
          lastUsedAt: undefined,
        }),
      );
    });
  });
});
