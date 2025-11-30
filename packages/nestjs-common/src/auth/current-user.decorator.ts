/**
 * @deprecated 此文件已废弃，请使用 guards/decorators.ts 中的 CurrentUser
 *
 * 迁移方式：
 * import { CurrentUser } from '@lnk/nestjs-common';
 *
 * 导出路径已保持兼容，但建议使用 guards/ 模块中的统一装饰器
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './jwt.types';

/**
 * 获取当前认证用户的装饰器
 *
 * @deprecated 请使用 guards/decorators.ts 中的 CurrentUser
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
