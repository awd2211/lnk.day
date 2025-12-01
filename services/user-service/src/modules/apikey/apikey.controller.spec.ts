import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiKeyController } from './apikey.controller';
import { ApiKeyService } from './apikey.service';
import { ApiKeyScope } from './apikey.entity';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let apiKeyService: jest.Mocked<ApiKeyService>;

  const mockApiKeyService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    revoke: jest.fn(),
    regenerate: jest.fn(),
    delete: jest.fn(),
  };

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

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    type: 'user',
    scope: { level: 'team', teamId: 'team-123' },
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    type: 'admin',
    scope: { level: 'platform' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        {
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
    apiKeyService = module.get(ApiKeyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'New API Key',
      description: 'Test description',
      scopes: [ApiKeyScope.READ],
    };

    it('should create an API key', async () => {
      mockApiKeyService.create.mockResolvedValue({
        apiKey: { ...mockApiKey, name: createDto.name },
        plainKey: 'lnk_newPlainKey123',
      });

      const result = await controller.create(createDto, mockUser as any, 'team-123');

      expect(apiKeyService.create).toHaveBeenCalledWith(
        'New API Key',
        'user-123',
        'team-123',
        expect.objectContaining({
          description: 'Test description',
          scopes: [ApiKeyScope.READ],
        }),
      );
      expect(result.data).toHaveProperty('key', 'lnk_newPlainKey123');
      expect(result.message).toContain('请立即保存此密钥');
    });

    it('should handle ipWhitelist field', async () => {
      const dtoWithIpWhitelist = {
        name: 'IP Restricted Key',
        ipWhitelist: ['192.168.1.1', '10.0.0.1'],
      };
      mockApiKeyService.create.mockResolvedValue({
        apiKey: { ...mockApiKey, allowedIps: dtoWithIpWhitelist.ipWhitelist },
        plainKey: 'lnk_key',
      });

      await controller.create(dtoWithIpWhitelist, mockUser as any, 'team-123');

      expect(apiKeyService.create).toHaveBeenCalledWith(
        'IP Restricted Key',
        'user-123',
        'team-123',
        expect.objectContaining({
          allowedIps: ['192.168.1.1', '10.0.0.1'],
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all API keys for a team', async () => {
      mockApiKeyService.findAll.mockResolvedValue([mockApiKey]);

      const result = await controller.findAll('team-123');

      expect(apiKeyService.findAll).toHaveBeenCalledWith('team-123');
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toHaveProperty('status', 'active');
    });

    it('should mark revoked keys with status revoked', async () => {
      mockApiKeyService.findAll.mockResolvedValue([
        { ...mockApiKey, isActive: false },
      ]);

      const result = await controller.findAll('team-123');

      expect(result.keys[0]).toHaveProperty('status', 'revoked');
    });

    it('should mark expired keys with status expired', async () => {
      const expiredDate = new Date(Date.now() - 86400000); // yesterday
      mockApiKeyService.findAll.mockResolvedValue([
        { ...mockApiKey, expiresAt: expiredDate },
      ]);

      const result = await controller.findAll('team-123');

      expect(result.keys[0]).toHaveProperty('status', 'expired');
    });
  });

  describe('getScopes', () => {
    it('should return available scopes', () => {
      const result = controller.getScopes();

      expect(result.scopes).toHaveLength(4);
      expect(result.scopes.map((s) => s.id)).toEqual([
        ApiKeyScope.READ,
        ApiKeyScope.WRITE,
        ApiKeyScope.DELETE,
        ApiKeyScope.ADMIN,
      ]);
    });
  });

  describe('findOne', () => {
    it('should return an API key by id', async () => {
      mockApiKeyService.findOne.mockResolvedValue(mockApiKey);

      const result = await controller.findOne('apikey-123', 'team-123', mockUser as any);

      expect(apiKeyService.findOne).toHaveBeenCalledWith('apikey-123');
      expect(result.id).toBe('apikey-123');
    });

    it('should allow platform admin to access any key', async () => {
      mockApiKeyService.findOne.mockResolvedValue({
        ...mockApiKey,
        teamId: 'other-team',
      });

      const result = await controller.findOne('apikey-123', 'team-123', mockAdminUser as any);

      expect(result.id).toBe('apikey-123');
    });

    it('should throw ForbiddenException if user tries to access another team key', async () => {
      mockApiKeyService.findOne.mockResolvedValue({
        ...mockApiKey,
        teamId: 'other-team',
      });

      await expect(
        controller.findOne('apikey-123', 'team-123', mockUser as any),
      ).rejects.toThrow(new ForbiddenException('无权访问此 API 密钥'));
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Key' };

    it('should update an API key', async () => {
      mockApiKeyService.findOne.mockResolvedValue(mockApiKey);
      mockApiKeyService.update.mockResolvedValue({ ...mockApiKey, ...updateDto });

      const result = await controller.update('apikey-123', updateDto, 'team-123', mockUser as any);

      expect(apiKeyService.update).toHaveBeenCalledWith('apikey-123', expect.objectContaining({ name: 'Updated Key' }));
      expect(result.name).toBe('Updated Key');
    });

    it('should throw ForbiddenException if user tries to update another team key', async () => {
      mockApiKeyService.findOne.mockResolvedValue({
        ...mockApiKey,
        teamId: 'other-team',
      });

      await expect(
        controller.update('apikey-123', updateDto, 'team-123', mockUser as any),
      ).rejects.toThrow(new ForbiddenException('无权修改此 API 密钥'));
    });
  });

  describe('revoke', () => {
    it('should revoke an API key', async () => {
      mockApiKeyService.findOne.mockResolvedValue(mockApiKey);
      mockApiKeyService.revoke.mockResolvedValue({ ...mockApiKey, isActive: false });

      const result = await controller.revoke('apikey-123', 'team-123', mockUser as any);

      expect(apiKeyService.revoke).toHaveBeenCalledWith('apikey-123');
      expect(result.isActive).toBe(false);
    });

    it('should throw ForbiddenException if user tries to revoke another team key', async () => {
      mockApiKeyService.findOne.mockResolvedValue({
        ...mockApiKey,
        teamId: 'other-team',
      });

      await expect(
        controller.revoke('apikey-123', 'team-123', mockUser as any),
      ).rejects.toThrow(new ForbiddenException('无权撤销此 API 密钥'));
    });
  });

  describe('regenerate', () => {
    it('should regenerate an API key', async () => {
      mockApiKeyService.findOne.mockResolvedValue(mockApiKey);
      mockApiKeyService.regenerate.mockResolvedValue({
        apiKey: mockApiKey,
        plainKey: 'lnk_newKey123',
      });

      const result = await controller.regenerate('apikey-123', 'team-123', mockUser as any);

      expect(apiKeyService.regenerate).toHaveBeenCalledWith('apikey-123');
      expect(result.key).toBe('lnk_newKey123');
      expect(result.message).toContain('请立即保存新密钥');
    });

    it('should throw ForbiddenException if user tries to regenerate another team key', async () => {
      mockApiKeyService.findOne.mockResolvedValue({
        ...mockApiKey,
        teamId: 'other-team',
      });

      await expect(
        controller.regenerate('apikey-123', 'team-123', mockUser as any),
      ).rejects.toThrow(new ForbiddenException('无权重新生成此 API 密钥'));
    });
  });

  describe('delete', () => {
    it('should delete an API key', async () => {
      mockApiKeyService.findOne.mockResolvedValue(mockApiKey);
      mockApiKeyService.delete.mockResolvedValue(undefined);

      await controller.delete('apikey-123', 'team-123', mockUser as any);

      expect(apiKeyService.delete).toHaveBeenCalledWith('apikey-123');
    });

    it('should throw ForbiddenException if user tries to delete another team key', async () => {
      mockApiKeyService.findOne.mockResolvedValue({
        ...mockApiKey,
        teamId: 'other-team',
      });

      await expect(
        controller.delete('apikey-123', 'team-123', mockUser as any),
      ).rejects.toThrow(new ForbiddenException('无权删除此 API 密钥'));
    });

    it('should allow platform admin to delete any key', async () => {
      mockApiKeyService.findOne.mockResolvedValue({
        ...mockApiKey,
        teamId: 'other-team',
      });
      mockApiKeyService.delete.mockResolvedValue(undefined);

      await controller.delete('apikey-123', 'team-123', mockAdminUser as any);

      expect(apiKeyService.delete).toHaveBeenCalledWith('apikey-123');
    });
  });
});
