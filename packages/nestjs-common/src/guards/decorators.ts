import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/jwt.types';

// ============================================================================
// 参数装饰器
// ============================================================================

/**
 * 获取当前认证用户
 *
 * 使用方式：
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 *
 * // 获取特定属性
 * @Get('me')
 * getMe(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

/**
 * 获取经过验证的作用域团队 ID
 * 由 ScopeGuard 注入，确保是安全的团队 ID
 *
 * 使用方式：
 * ```typescript
 * @Get()
 * @UseGuards(ScopeGuard)
 * findAll(@ScopedTeamId() teamId: string) {
 *   // teamId 是经过验证的安全值
 *   return this.service.findAll(teamId);
 * }
 * ```
 */
export const ScopedTeamId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.scopedTeamId;
  },
);

/**
 * 检查是否是管理员访问
 * 由 ScopeGuard 在管理员访问时设置
 *
 * 使用方式：
 * ```typescript
 * @Get()
 * findAll(@IsAdminAccess() isAdmin: boolean) {
 *   if (isAdmin) {
 *     // 管理员可以看到更多信息
 *   }
 * }
 * ```
 */
export const IsAdminAccess = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    return !!request.isAdminAccess;
  },
);

/**
 * 获取用户 ID
 * 快捷方式，等同于 @CurrentUser('id')
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);

/**
 * 获取用户邮箱
 * 快捷方式，等同于 @CurrentUser('email')
 */
export const UserEmail = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.email;
  },
);

// ============================================================================
// 方法/类装饰器
// ============================================================================

/**
 * 公开访问装饰器 key
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记为公开访问（跳过认证）
 *
 * 使用方式：
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ============================================================================
// 导出权限装饰器（从 permission.guard.ts 重新导出）
// ============================================================================

export {
  RequirePermissions,
  RequireAnyPermission,
  PublicPermission,
  OwnerOnly,
  AdminOnly,
} from './permission.guard';

export { SkipScopeCheck } from './scope.guard';
