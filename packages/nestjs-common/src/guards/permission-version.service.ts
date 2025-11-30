import { Injectable, Inject, Optional } from '@nestjs/common';

/**
 * Redis 服务接口
 */
export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<void>;
  incr(key: string): Promise<number>;
  del(key: string): Promise<void>;
}

/**
 * 权限版本服务
 *
 * 用于实现权限的实时失效机制：
 * 1. 每个用户有一个权限版本号存储在 Redis
 * 2. JWT 中包含签发时的版本号
 * 3. 验证时检查 JWT 版本是否 >= Redis 版本
 * 4. 权限变更时递增版本号，使旧 token 失效
 *
 * 使用场景：
 * - 用户被移出团队
 * - 用户角色变更
 * - 自定义角色权限变更
 * - 用户被停用
 */
@Injectable()
export class PermissionVersionService {
  private readonly KEY_PREFIX = 'pv:';
  private readonly DEFAULT_TTL = 30 * 24 * 60 * 60; // 30 天

  constructor(
    @Optional()
    @Inject('REDIS_CLIENT')
    private readonly redis?: IRedisClient,
  ) {}

  /**
   * 获取用户当前的权限版本
   */
  async getVersion(userId: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }
    const version = await this.redis.get(this.getKey(userId));
    return version ? parseInt(version, 10) : 0;
  }

  /**
   * 递增用户的权限版本（使旧 token 失效）
   *
   * @param userId 用户 ID
   * @returns 新的版本号
   */
  async incrementVersion(userId: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }
    const newVersion = await this.redis.incr(this.getKey(userId));
    return newVersion;
  }

  /**
   * 设置用户的权限版本
   *
   * @param userId 用户 ID
   * @param version 版本号
   */
  async setVersion(userId: string, version: number): Promise<void> {
    if (!this.redis) {
      return;
    }
    await this.redis.set(this.getKey(userId), version.toString(), {
      EX: this.DEFAULT_TTL,
    });
  }

  /**
   * 删除用户的权限版本（用户删除时）
   */
  async deleteVersion(userId: string): Promise<void> {
    if (!this.redis) {
      return;
    }
    await this.redis.del(this.getKey(userId));
  }

  /**
   * 批量递增版本（团队权限变更时）
   *
   * @param userIds 用户 ID 数组
   */
  async incrementVersionBatch(userIds: string[]): Promise<void> {
    if (!this.redis || userIds.length === 0) {
      return;
    }
    await Promise.all(userIds.map(id => this.incrementVersion(id)));
  }

  /**
   * 验证 token 中的版本是否有效
   *
   * @param userId 用户 ID
   * @param tokenVersion token 中的版本号
   * @returns 是否有效
   */
  async isVersionValid(userId: string, tokenVersion: number): Promise<boolean> {
    if (!this.redis) {
      return true; // 没有 Redis 时默认有效
    }
    const currentVersion = await this.getVersion(userId);
    return tokenVersion >= currentVersion;
  }

  private getKey(userId: string): string {
    return `${this.KEY_PREFIX}${userId}`;
  }
}

/**
 * 权限版本模块配置
 */
export interface PermissionVersionModuleOptions {
  /** Redis 客户端提供者 token */
  redisClientToken?: string;
}
