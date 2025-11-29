import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './jwt.types';

/**
 * 获取当前认证用户的装饰器
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 *
 * @Get('user-id')
 * getUserId(@CurrentUser('id') userId: string) {
 *   return userId;
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
