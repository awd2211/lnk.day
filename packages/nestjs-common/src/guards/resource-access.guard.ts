import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser, isPlatformAdmin } from '../auth/jwt.types';

/**
 * 资源访问守卫基类
 *
 * 功能：
 * 1. 验证用户是否有权访问特定资源
 * 2. 平台管理员可以访问任何资源
 * 3. 普通用户只能访问自己团队的资源
 * 4. 子类需要实现 getResourceTeamId 方法
 *
 * 使用方式：
 * ```typescript
 * @Injectable()
 * export class LinkAccessGuard extends ResourceAccessGuard {
 *   constructor(private linkService: LinkService) {
 *     super();
 *   }
 *
 *   async getResourceTeamId(request: any): Promise<string | null> {
 *     const linkId = request.params.id;
 *     if (!linkId) return null;
 *     const link = await this.linkService.findOneRaw(linkId);
 *     return link?.teamId || null;
 *   }
 * }
 *
 * // 在 Controller 中使用
 * @Delete(':id')
 * @UseGuards(LinkAccessGuard)
 * remove(@Param('id') id: string) {}
 * ```
 */
@Injectable()
export abstract class ResourceAccessGuard implements CanActivate {
  protected readonly reflector = new Reflector();

  /**
   * 获取资源所属的团队 ID
   * 子类必须实现此方法
   *
   * @param request 请求对象
   * @returns 资源所属的团队 ID，如果资源不存在返回 null
   */
  abstract getResourceTeamId(request: any): Promise<string | null>;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    // 平台管理员可以访问任何资源
    if (isPlatformAdmin(user)) {
      return true;
    }

    // 获取资源所属的团队 ID
    const resourceTeamId = await this.getResourceTeamId(request);

    // 如果没有获取到团队 ID（可能资源不存在），允许继续
    // 具体的 404 错误由 Service 层处理
    if (!resourceTeamId) {
      return true;
    }

    // 获取用户的作用域团队 ID（由 ScopeGuard 注入）
    const userTeamId = request.scopedTeamId || user.scope?.teamId;

    // 验证资源归属
    if (resourceTeamId !== userTeamId) {
      throw new ForbiddenException('无权访问此资源');
    }

    return true;
  }
}

/**
 * 创建资源访问守卫的工厂函数
 *
 * @param getResourceTeamId 获取资源团队 ID 的函数
 * @returns 资源访问守卫类
 *
 * 使用方式：
 * ```typescript
 * const LinkAccessGuard = createResourceAccessGuard(async (request, linkService) => {
 *   const link = await linkService.findOneRaw(request.params.id);
 *   return link?.teamId || null;
 * });
 * ```
 */
export function createResourceAccessGuard(
  getResourceTeamIdFn: (request: any) => Promise<string | null>,
): new () => ResourceAccessGuard {
  @Injectable()
  class DynamicResourceAccessGuard extends ResourceAccessGuard {
    async getResourceTeamId(request: any): Promise<string | null> {
      return getResourceTeamIdFn(request);
    }
  }

  return DynamicResourceAccessGuard;
}
