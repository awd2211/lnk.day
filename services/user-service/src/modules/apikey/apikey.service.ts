import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

import { ApiKey, ApiKeyScope } from './apikey.entity';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(
    name: string,
    userId: string,
    teamId: string,
    options?: {
      description?: string;
      scopes?: ApiKeyScope[];
      expiresAt?: Date;
      rateLimit?: number;
      allowedIps?: string[];
    },
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    // Generate secure API key
    const plainKey = this.generateApiKey();
    const keyHash = this.hashKey(plainKey);
    const keyPrefix = plainKey.substring(0, 12);

    const apiKey = this.apiKeyRepository.create({
      name,
      keyHash,
      keyPrefix,
      userId,
      teamId,
      description: options?.description,
      scopes: options?.scopes || [ApiKeyScope.READ],
      expiresAt: options?.expiresAt,
      rateLimit: options?.rateLimit,
      allowedIps: options?.allowedIps || [],
    });

    const saved = await this.apiKeyRepository.save(apiKey);

    // Return the plain key only once (won't be stored)
    return { apiKey: saved, plainKey };
  }

  async findAll(teamId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException(`API Key with ID ${id} not found`);
    }
    return apiKey;
  }

  async validateKey(
    plainKey: string,
    requiredScope?: ApiKeyScope,
    clientIp?: string,
  ): Promise<ApiKey> {
    const keyHash = this.hashKey(plainKey);

    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash, isActive: true },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      throw new UnauthorizedException('API key has expired');
    }

    // Check scope
    if (requiredScope && !apiKey.scopes.includes(requiredScope) && !apiKey.scopes.includes(ApiKeyScope.ADMIN)) {
      throw new UnauthorizedException('Insufficient API key scope');
    }

    // Check IP allowlist
    if (apiKey.allowedIps.length > 0 && clientIp) {
      if (!apiKey.allowedIps.includes(clientIp)) {
        throw new UnauthorizedException('IP not allowed for this API key');
      }
    }

    // Update usage stats
    apiKey.lastUsedAt = new Date();
    apiKey.usageCount += 1;
    await this.apiKeyRepository.save(apiKey);

    return apiKey;
  }

  async revoke(id: string): Promise<ApiKey> {
    const apiKey = await this.findOne(id);
    apiKey.isActive = false;
    return this.apiKeyRepository.save(apiKey);
  }

  async update(
    id: string,
    updates: {
      name?: string;
      description?: string;
      scopes?: ApiKeyScope[];
      rateLimit?: number;
      allowedIps?: string[];
    },
  ): Promise<ApiKey> {
    const apiKey = await this.findOne(id);
    Object.assign(apiKey, updates);
    return this.apiKeyRepository.save(apiKey);
  }

  async delete(id: string): Promise<void> {
    const apiKey = await this.findOne(id);
    await this.apiKeyRepository.remove(apiKey);
  }

  async regenerate(id: string): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const existing = await this.findOne(id);

    const plainKey = this.generateApiKey();
    const keyHash = this.hashKey(plainKey);
    const keyPrefix = plainKey.substring(0, 12);

    existing.keyHash = keyHash;
    existing.keyPrefix = keyPrefix;
    existing.usageCount = 0;
    existing.lastUsedAt = undefined;

    const saved = await this.apiKeyRepository.save(existing);
    return { apiKey: saved, plainKey };
  }

  private generateApiKey(): string {
    // Format: lnk_[32 random chars]
    const random = randomBytes(24).toString('base64url');
    return `lnk_${random}`;
  }

  private hashKey(plainKey: string): string {
    return createHash('sha256').update(plainKey).digest('hex');
  }
}
