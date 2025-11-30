/**
 * @deprecated 此文件已废弃，请使用 guards/permission.guard.ts 中的新版本
 *
 * 迁移指南：
 * - PermissionGuard -> import { PermissionGuard } from '@lnk/nestjs-common'（来自 guards/ 模块）
 * - ResourceOwnerGuard -> import { ResourceAccessGuard } from '@lnk/nestjs-common'
 * - JwtUser -> import { AuthenticatedUser } from '@lnk/nestjs-common'
 *
 * 新版本特性：
 * - 统一支持用户和管理员权限检查
 * - 支持平台管理员角色（PLATFORM_ADMIN, SUPER_ADMIN）
 * - 与 ScopeGuard 配合防止 IDOR 攻击
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from './permissions.enum';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
  PUBLIC_PERMISSION_KEY,
  OWNER_ONLY_KEY,
  PermissionMode,
} from './permissions.decorator';

/**
 * JWT 用户信息接口
 * @deprecated 请使用 AuthenticatedUser from '@lnk/nestjs-common'
 */
export interface JwtUser {
  sub: string;           // 用户 ID
  email: string;
  teamId?: string;
  teamRole?: string;     // OWNER | ADMIN | MEMBER | VIEWER
  permissions?: Permission[];
  iat?: number;
  exp?: number;
}

/**
 * 权限守卫
 * 检查用户是否拥有访问资源所需的权限
 *
 * @deprecated 请使用 guards/permission.guard.ts 中的新版 PermissionGuard
 *
 * 使用方式：
 * 1. 全局启用：在 AppModule 中注册为 APP_GUARD
 * 2. 控制器级别：@UseGuards(PermissionGuard)
 * 3. 方法级别：@UseGuards(PermissionGuard)
 *
 * 配合装饰器使用：
 * - @RequirePermissions(Permission.LINKS_CREATE) - 需要所有权限
 * - @RequireAnyPermission(Permission.LINKS_EDIT, Permission.LINKS_DELETE) - 需要任一权限
 * - @PublicPermission() - 跳过权限检查
 * - @OwnerOnly() - 仅团队所有者
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  // 创建自己的 Reflector 实例，因为 Reflector 在非根模块中可能不可用
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    // 检查是否标记为公开权限
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 获取请求和用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    if (!user) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    // 检查是否仅允许所有者
    const ownerOnly = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (ownerOnly && user.teamRole !== 'OWNER') {
      throw new ForbiddenException('此操作仅允许团队所有者执行');
    }

    // 获取所需权限
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有指定权限要求，允许访问
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 获取用户权限
    const userPermissions = user.permissions || [];

    // 团队所有者拥有所有权限
    if (user.teamRole === 'OWNER') {
      return true;
    }

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

/**
 * 资源所有权守卫
 * 检查用户是否是资源的所有者（创建者）
 *
 * @deprecated 请使用 guards/resource-access.guard.ts 中的 ResourceAccessGuard
 *
 * 需要在服务层实现 getResourceOwner 方法
 */
@Injectable()
export abstract class ResourceOwnerGuard implements CanActivate {
  // 创建自己的 Reflector 实例，因为 Reflector 在非根模块中可能不可用
  protected readonly reflector = new Reflector();

  /**
   * 获取资源所有者 ID
   * 子类必须实现此方法
   */
  abstract getResourceOwnerId(request: any): Promise<string | null>;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    if (!user) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    // 团队所有者和管理员可以访问所有资源
    if (user.teamRole === 'OWNER' || user.teamRole === 'ADMIN') {
      return true;
    }

    // 检查是否是资源所有者
    const resourceOwnerId = await this.getResourceOwnerId(request);

    if (resourceOwnerId && resourceOwnerId === user.sub) {
      return true;
    }

    // 检查是否有编辑权限
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredPermissions && user.permissions) {
      const hasAccess = hasAllPermissions(user.permissions, requiredPermissions);
      if (hasAccess) {
        return true;
      }
    }

    throw new ForbiddenException('无权访问此资源');
  }
}
