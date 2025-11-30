import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AuthenticatedUser,
  TeamRole,
  AdminRole,
  isPlatformAdmin,
  isSuperAdmin,
  isTeamOwner,
} from '../auth/jwt.types';
import { hasAnyPermission, hasAllPermissions } from '../permissions/permissions.enum';

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

/**
 * 统一权限守卫
 *
 * 功能：
 * 1. 支持普通用户和平台管理员两种类型
 * 2. 平台管理员（SUPER_ADMIN）拥有所有权限
 * 3. 团队所有者（OWNER）拥有团队内所有权限
 * 4. 支持 @RequirePermissions、@RequireAnyPermission 装饰器
 * 5. 支持 @PublicPermission、@OwnerOnly、@AdminOnly 装饰器
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
 * }
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    // 1. 检查是否标记为公开权限
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. 获取用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    // 3. 内部 API 调用 (console-service 等内部服务) 拥有所有权限
    // 注意: 必须在 AdminOnly/OwnerOnly 检查之前，否则内部服务调用会被拒绝
    if ((user as any).role === 'INTERNAL') {
      return true;
    }

    // 4. 检查是否仅允许管理员
    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (adminOnly && !isPlatformAdmin(user)) {
      throw new ForbiddenException('此操作仅允许平台管理员执行');
    }

    // 5. 检查是否仅允许团队所有者
    const ownerOnly = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (ownerOnly) {
      // 平台管理员视为拥有所有者权限
      if (!isPlatformAdmin(user) && !isTeamOwner(user)) {
        throw new ForbiddenException('此操作仅允许团队所有者执行');
      }
    }

    // 6. 获取所需权限
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有指定权限要求，允许访问
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 8. 超级管理员拥有所有权限
    if (isSuperAdmin(user)) {
      return true;
    }

    // 9. 平台管理员检查管理权限
    if (isPlatformAdmin(user)) {
      return this.checkPermissions(user.permissions || [], requiredPermissions, context);
    }

    // 10. 团队所有者拥有团队内所有资源权限
    if (isTeamOwner(user)) {
      // 检查是否是管理员权限（admin:* 开头）
      const hasAdminPermission = requiredPermissions.some(p => p.startsWith('admin:'));
      if (hasAdminPermission) {
        // 团队所有者没有管理员权限
        throw new ForbiddenException({
          message: '权限不足',
          code: 'PERMISSION_DENIED',
          required: requiredPermissions,
          missing: requiredPermissions.filter(p => p.startsWith('admin:')),
        });
      }
      return true;
    }

    // 11. 普通用户检查权限
    return this.checkPermissions(user.permissions || [], requiredPermissions, context);
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
