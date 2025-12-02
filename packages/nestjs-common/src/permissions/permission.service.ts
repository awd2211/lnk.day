import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  TEAM_ROLE_PERMISSIONS,
  ADMIN_ROLE_PERMISSIONS,
  getRolePermissions,
  Permission,
} from './permissions.enum';
import { AuthenticatedUser, TeamRole } from '../auth/jwt.types';
import { IRedisService } from '../guards/unified-auth.guard';

/**
 * 权限缓存配置
 */
export interface PermissionCacheConfig {
  /** 缓存 TTL（秒） */
  ttl: number;
  /** 缓存前缀 */
  prefix: string;
}

const DEFAULT_CACHE_CONFIG: PermissionCacheConfig = {
  ttl: 300, // 5 分钟
  prefix: 'perm:',
};

/**
 * 权限服务
 *
 * 职责：
 * 1. 根据角色实时获取权限列表
 * 2. 权限缓存管理
 * 3. 自定义角色权限查询
 *
 * 使用方式：
 * ```typescript
 * // 在模块中注册
 * @Module({
 *   providers: [
 *     PermissionService,
 *     { provide: 'REDIS_SERVICE', useClass: RedisService },
 *   ],
 * })
 *
 * // 在 Guard 或 Service 中使用
 * const permissions = await permissionService.getUserPermissions(user);
 * ```
 */
@Injectable()
export class PermissionService {
  private readonly cacheConfig: PermissionCacheConfig;

  constructor(
    @Optional() @Inject('REDIS_SERVICE') private readonly redisService?: IRedisService,
    @Optional() @Inject('PERMISSION_CACHE_CONFIG') cacheConfig?: PermissionCacheConfig,
  ) {
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...cacheConfig };
  }

  /**
   * 获取用户的权限列表
   *
   * 优先级：
   * 1. 检查缓存
   * 2. 检查自定义角色权限
   * 3. 使用预设角色权限
   */
  async getUserPermissions(user: AuthenticatedUser): Promise<string[]> {
    // 内部服务调用拥有所有权限
    if ((user as any).role === 'INTERNAL') {
      return [...Object.values(Permission)];
    }

    // 尝试从缓存获取
    const cached = await this.getFromCache(user.id, user.scope?.teamId);
    if (cached) {
      return cached;
    }

    // 根据用户类型获取权限
    let permissions: string[];

    if (user.type === 'admin') {
      // 管理员使用管理员角色权限
      permissions = ADMIN_ROLE_PERMISSIONS[user.role] || [];
    } else {
      // 普通用户
      // 如果 Token 中有 customRoleId，需要查询自定义角色
      if ((user as any).customRoleId) {
        permissions = await this.getCustomRolePermissions((user as any).customRoleId);
      } else {
        // 使用预设角色权限
        permissions = getRolePermissions(user.role);
      }
    }

    // 缓存权限
    await this.setToCache(user.id, user.scope?.teamId, permissions);

    return permissions;
  }

  /**
   * 获取角色的权限列表（预设角色）
   */
  getRolePermissions(role: string, isAdmin = false): string[] {
    if (isAdmin) {
      return ADMIN_ROLE_PERMISSIONS[role] || [];
    }
    return TEAM_ROLE_PERMISSIONS[role] || [];
  }

  /**
   * 获取自定义角色的权限
   * 注意：这需要注入具体的角色仓库实现
   */
  async getCustomRolePermissions(customRoleId: string): Promise<string[]> {
    // 尝试从缓存获取
    const cacheKey = `${this.cacheConfig.prefix}role:${customRoleId}`;
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // TODO: 需要注入角色仓库来查询自定义角色
    // 这里返回空数组，实际实现需要在具体服务中覆盖
    return [];
  }

  /**
   * 使用户的权限缓存失效
   */
  async invalidateUserPermissions(userId: string, teamId?: string): Promise<void> {
    const cacheKey = this.buildCacheKey(userId, teamId);
    if (this.redisService) {
      await this.redisService.del(cacheKey);
    }
  }

  /**
   * 使自定义角色的权限缓存失效
   */
  async invalidateRolePermissions(roleId: string): Promise<void> {
    const cacheKey = `${this.cacheConfig.prefix}role:${roleId}`;
    if (this.redisService) {
      await this.redisService.del(cacheKey);
    }
  }

  /**
   * 检查用户是否拥有指定权限
   */
  async hasPermission(user: AuthenticatedUser, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(user);
    return permissions.includes(permission);
  }

  /**
   * 检查用户是否拥有所有指定权限
   */
  async hasAllPermissions(user: AuthenticatedUser, requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(user);
    return requiredPermissions.every(p => permissions.includes(p));
  }

  /**
   * 检查用户是否拥有任意一个指定权限
   */
  async hasAnyPermission(user: AuthenticatedUser, requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(user);
    return requiredPermissions.some(p => permissions.includes(p));
  }

  // ========== 私有方法 ==========

  private buildCacheKey(userId: string, teamId?: string): string {
    return teamId
      ? `${this.cacheConfig.prefix}${userId}:${teamId}`
      : `${this.cacheConfig.prefix}${userId}`;
  }

  private async getFromCache(userId: string, teamId?: string): Promise<string[] | null> {
    if (!this.redisService) {
      return null;
    }

    const cacheKey = this.buildCacheKey(userId, teamId);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }

    return null;
  }

  private async setToCache(userId: string, teamId: string | undefined, permissions: string[]): Promise<void> {
    if (!this.redisService) {
      return;
    }

    const cacheKey = this.buildCacheKey(userId, teamId);
    await this.redisService.set(cacheKey, JSON.stringify(permissions), this.cacheConfig.ttl);
  }
}

/**
 * 权限服务工厂函数
 */
export function createPermissionService(config?: Partial<PermissionCacheConfig>) {
  return {
    provide: PermissionService,
    useFactory: (redisService?: IRedisService) => {
      return new PermissionService(
        redisService,
        config ? { ...DEFAULT_CACHE_CONFIG, ...config } : DEFAULT_CACHE_CONFIG,
      );
    },
    inject: [{ token: 'REDIS_SERVICE', optional: true }],
  };
}
