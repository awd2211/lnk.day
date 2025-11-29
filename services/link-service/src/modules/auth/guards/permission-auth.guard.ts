import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import {
  Permission,
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
  PUBLIC_PERMISSION_KEY,
  OWNER_ONLY_KEY,
  PermissionMode,
  hasAnyPermission,
  hasAllPermissions,
} from '@lnk/nestjs-common';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * 组合 JWT 认证和权限检查的守卫
 * 先验证 JWT，然后检查权限
 */
@Injectable()
export class PermissionAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // 先执行 JWT 认证
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    // 检查是否标记为公开权限（跳过权限检查但仍需认证）
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 获取请求和用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    // Console admin 用户拥有所有权限
    if (user.isConsoleAdmin) {
      return true;
    }

    // 检查是否仅允许团队所有者
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

    // 团队所有者拥有所有权限
    if (user.teamRole === 'OWNER') {
      return true;
    }

    // 获取用户权限
    const userPermissions = user.permissions || [];

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
