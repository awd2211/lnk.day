import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AuthenticatedUser,
  isPlatformAdmin,
  isSuperAdmin,
  isTeamOwner,
} from '../auth/jwt.types';
import {
  hasAnyPermission,
  hasAllPermissions,
  TEAM_ROLE_PERMISSIONS,
  ADMIN_ROLE_PERMISSIONS,
  Permission,
} from '../permissions/permissions.enum';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * 权限检查模式
 */
export type PermissionMode = 'all' | 'any';

/**
 * 装饰器 Metadata Keys
 */
export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_MODE_KEY = 'permissionsMode';
export const PUBLIC_PERMISSION_KEY = 'publicPermission';
export const OWNER_ONLY_KEY = 'ownerOnly';
export const ADMIN_ONLY_KEY = 'adminOnly';

// ============================================================================
// 条件权限 (ABAC) 相关定义
// ============================================================================

/**
 * 条件操作符
 */
export type ConditionOperator = 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte';

/**
 * 权限条件定义
 */
export interface PermissionCondition {
  /** 字段路径（支持 user.id, resource.createdBy 等） */
  field: string;
  /** 操作符 */
  operator: ConditionOperator;
  /** 比较值（支持变量替换如 ${user.id}） */
  value: any;
}

/**
 * 条件权限配置
 */
export interface ConditionalPermission {
  /** 基础权限 */
  permission: string;
  /** 条件列表（AND 逻辑） */
  conditions: PermissionCondition[];
}

export const PERMISSION_CONDITIONS_KEY = 'permissionConditions';

// 使用统一的 IRedisService 接口
import type { IRedisService } from './unified-auth.guard';

/**
 * 权限缓存配置
 */
const PERMISSION_CACHE_TTL = 300; // 5 分钟
const PERMISSION_CACHE_PREFIX = 'perm:';

/**
 * 统一权限守卫
 *
 * 功能：
 * 1. 支持普通用户和平台管理员两种类型
 * 2. 平台管理员（SUPER_ADMIN）拥有所有权限
 * 3. 团队所有者（OWNER）拥有团队内所有权限
 * 4. 支持 @RequirePermissions、@RequireAnyPermission 装饰器
 * 5. 支持 @PublicPermission、@OwnerOnly、@AdminOnly 装饰器
 * 6. 支持条件权限 (ABAC) @RequireCondition 装饰器
 * 7. 权限从服务端实时计算，不依赖 Token 中的权限列表
 *
 * 使用方式：
 * ```typescript
 * @UseGuards(UnifiedAuthGuard, ScopeGuard, PermissionGuard)
 * @Controller('links')
 * export class LinkController {
 *   @Get()
 *   @RequirePermissions(Permission.LINKS_VIEW)
 *   findAll() {}
 *
 *   @Delete(':id')
 *   @OwnerOnly()
 *   remove() {}
 *
 *   // 条件权限：只能删除自己创建的链接
 *   @Delete(':id')
 *   @RequireCondition({
 *     permission: 'links:delete',
 *     conditions: [
 *       { field: 'resource.createdBy', operator: 'eq', value: '${user.id}' }
 *     ]
 *   })
 *   deleteOwn() {}
 * }
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly reflector = new Reflector();

  constructor(
    @Optional() @Inject('REDIS_SERVICE') private readonly redisService?: IRedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 检查是否为公开路由（@Public() 装饰器）
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublicRoute) {
      return true;
    }

    // 2. 检查是否标记为公开权限（@PublicPermission() 装饰器）
    const isPublicPermission = this.reflector.getAllAndOverride<boolean>(PUBLIC_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublicPermission) {
      return true;
    }

    // 3. 获取用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    // 4. 内部 API 调用 (console-service 等内部服务) 拥有所有权限
    if ((user as any).role === 'INTERNAL') {
      return true;
    }

    // 5. 检查是否仅允许管理员
    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (adminOnly && !isPlatformAdmin(user)) {
      throw new ForbiddenException('此操作仅允许平台管理员执行');
    }

    // 6. 检查是否仅允许团队所有者
    const ownerOnly = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (ownerOnly) {
      if (!isPlatformAdmin(user) && !isTeamOwner(user)) {
        throw new ForbiddenException('此操作仅允许团队所有者执行');
      }
    }

    // 7. 获取所需权限
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 8. 获取条件权限
    const conditionalPermission = this.reflector.getAllAndOverride<ConditionalPermission>(
      PERMISSION_CONDITIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有指定权限要求，允许访问
    if ((!requiredPermissions || requiredPermissions.length === 0) && !conditionalPermission) {
      return true;
    }

    // 9. 超级管理员拥有所有权限
    if (isSuperAdmin(user)) {
      return true;
    }

    // 10. 获取用户实际权限（从角色实时计算）
    const userPermissions = await this.getUserPermissions(user);

    // 11. 平台管理员检查管理权限
    if (isPlatformAdmin(user)) {
      if (requiredPermissions) {
        return this.checkPermissions(userPermissions, requiredPermissions, context);
      }
      return true;
    }

    // 12. 团队所有者拥有团队内所有资源权限
    if (isTeamOwner(user)) {
      if (requiredPermissions) {
        // 检查是否是管理员权限（admin:* 开头）
        const hasAdminPermission = requiredPermissions.some(p => p.startsWith('admin:'));
        if (hasAdminPermission) {
          throw new ForbiddenException({
            message: '权限不足',
            code: 'PERMISSION_DENIED',
            required: requiredPermissions,
            missing: requiredPermissions.filter(p => p.startsWith('admin:')),
          });
        }
      }
      // 团队所有者跳过普通权限检查，但仍需检查条件权限
      if (conditionalPermission) {
        return this.checkConditionalPermission(conditionalPermission, user, request);
      }
      return true;
    }

    // 13. 普通用户检查权限
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAccess = this.checkPermissions(userPermissions, requiredPermissions, context);
      if (!hasAccess) {
        return false;
      }
    }

    // 14. 检查条件权限
    if (conditionalPermission) {
      // 先检查基础权限
      if (!userPermissions.includes(conditionalPermission.permission)) {
        throw new ForbiddenException({
          message: '权限不足',
          code: 'PERMISSION_DENIED',
          required: [conditionalPermission.permission],
          missing: [conditionalPermission.permission],
        });
      }
      // 再检查条件
      return this.checkConditionalPermission(conditionalPermission, user, request);
    }

    return true;
  }

  /**
   * 获取用户权限（服务端实时计算）
   */
  private async getUserPermissions(user: AuthenticatedUser): Promise<string[]> {
    // 1. 尝试从缓存获取
    const cached = await this.getPermissionsFromCache(user);
    if (cached) {
      return cached;
    }

    // 2. 根据角色计算权限
    let permissions: string[];

    if (user.type === 'admin') {
      // 管理员使用管理员角色权限
      permissions = ADMIN_ROLE_PERMISSIONS[user.role] || [];
    } else {
      // 普通用户使用团队角色权限
      // 如果有 customRoleId，需要查询自定义角色（这里简化处理，实际需要查询数据库）
      if ((user as any).customRoleId) {
        // TODO: 查询自定义角色权限
        permissions = TEAM_ROLE_PERMISSIONS[user.role] || [];
      } else {
        permissions = TEAM_ROLE_PERMISSIONS[user.role] || [];
      }
    }

    // 3. 缓存权限
    await this.setPermissionsToCache(user, permissions);

    return permissions;
  }

  /**
   * 从缓存获取权限
   */
  private async getPermissionsFromCache(user: AuthenticatedUser): Promise<string[] | null> {
    if (!this.redisService) {
      return null;
    }

    const cacheKey = this.buildCacheKey(user);
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

  /**
   * 设置权限到缓存
   */
  private async setPermissionsToCache(user: AuthenticatedUser, permissions: string[]): Promise<void> {
    if (!this.redisService) {
      return;
    }

    const cacheKey = this.buildCacheKey(user);
    await this.redisService.set(cacheKey, JSON.stringify(permissions), PERMISSION_CACHE_TTL);
  }

  /**
   * 构建缓存 Key
   */
  private buildCacheKey(user: AuthenticatedUser): string {
    const teamId = user.scope?.teamId || 'global';
    return `${PERMISSION_CACHE_PREFIX}${user.id}:${teamId}:${user.role}`;
  }

  /**
   * 检查用户是否拥有所需权限
   */
  private checkPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
    context: ExecutionContext,
  ): boolean {
    // 获取权限检查模式
    const mode = this.reflector.getAllAndOverride<PermissionMode>(PERMISSIONS_MODE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'all';

    // 检查权限
    const hasAccess = mode === 'any'
      ? hasAnyPermission(userPermissions, requiredPermissions)
      : hasAllPermissions(userPermissions, requiredPermissions);

    if (!hasAccess) {
      const missingPermissions = requiredPermissions.filter(p => !userPermissions.includes(p));
      throw new ForbiddenException({
        message: '权限不足',
        code: 'PERMISSION_DENIED',
        required: requiredPermissions,
        missing: missingPermissions,
      });
    }

    return true;
  }

  /**
   * 检查条件权限
   */
  private async checkConditionalPermission(
    config: ConditionalPermission,
    user: AuthenticatedUser,
    request: any,
  ): Promise<boolean> {
    for (const condition of config.conditions) {
      const fieldValue = this.resolveFieldValue(condition.field, user, request);
      const compareValue = this.resolveCompareValue(condition.value, user, request);

      if (!this.evaluateCondition(fieldValue, condition.operator, compareValue)) {
        throw new ForbiddenException({
          message: '条件权限检查失败',
          code: 'CONDITION_NOT_MET',
          condition: {
            field: condition.field,
            operator: condition.operator,
            expected: compareValue,
            actual: fieldValue,
          },
        });
      }
    }

    return true;
  }

  /**
   * 解析字段值
   */
  private resolveFieldValue(field: string, user: AuthenticatedUser, request: any): any {
    const parts = field.split('.');
    const root = parts[0];
    const path = parts.slice(1);

    let obj: any;
    switch (root) {
      case 'user':
        obj = user;
        break;
      case 'resource':
        // 资源数据需要从 request 中获取（由 ResourceAccessGuard 设置）
        obj = request.resource;
        break;
      case 'params':
        obj = request.params;
        break;
      case 'query':
        obj = request.query;
        break;
      case 'body':
        obj = request.body;
        break;
      default:
        return undefined;
    }

    return this.getNestedValue(obj, path);
  }

  /**
   * 解析比较值（支持变量替换）
   */
  private resolveCompareValue(value: any, user: AuthenticatedUser, request: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // 支持 ${user.id} 格式的变量替换
    const match = value.match(/^\$\{(.+)\}$/);
    if (match) {
      return this.resolveFieldValue(match[1], user, request);
    }

    return value;
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string[]): any {
    if (!obj || path.length === 0) {
      return obj;
    }

    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(fieldValue: any, operator: ConditionOperator, compareValue: any): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === compareValue;
      case 'ne':
        return fieldValue !== compareValue;
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'nin':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      case 'gt':
        return fieldValue > compareValue;
      case 'gte':
        return fieldValue >= compareValue;
      case 'lt':
        return fieldValue < compareValue;
      case 'lte':
        return fieldValue <= compareValue;
      default:
        return false;
    }
  }
}

// ============================================================================
// 权限装饰器
// ============================================================================

import { SetMetadata } from '@nestjs/common';

/**
 * 需要所有指定权限
 */
export function RequirePermissions(...permissions: string[]) {
  return (target: any, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key!, descriptor!);
    SetMetadata(PERMISSIONS_MODE_KEY, 'all')(target, key!, descriptor!);
  };
}

/**
 * 需要任意一个权限
 */
export function RequireAnyPermission(...permissions: string[]) {
  return (target: any, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key!, descriptor!);
    SetMetadata(PERMISSIONS_MODE_KEY, 'any')(target, key!, descriptor!);
  };
}

/**
 * 条件权限（ABAC）
 *
 * @example
 * // 只能删除自己创建的链接
 * @RequireCondition({
 *   permission: 'links:delete',
 *   conditions: [
 *     { field: 'resource.createdBy', operator: 'eq', value: '${user.id}' }
 *   ]
 * })
 *
 * @example
 * // 只能编辑草稿状态的内容
 * @RequireCondition({
 *   permission: 'pages:edit',
 *   conditions: [
 *     { field: 'resource.status', operator: 'in', value: ['draft', 'review'] }
 *   ]
 * })
 */
export function RequireCondition(config: ConditionalPermission) {
  return SetMetadata(PERMISSION_CONDITIONS_KEY, config);
}

/**
 * 公开权限（跳过权限检查）
 */
export const PublicPermission = () => SetMetadata(PUBLIC_PERMISSION_KEY, true);

/**
 * 仅团队所有者可访问
 */
export const OwnerOnly = () => SetMetadata(OWNER_ONLY_KEY, true);

/**
 * 仅平台管理员可访问
 */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);
