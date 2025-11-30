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
import { AuthenticatedUser, isPlatformAdmin } from '../auth/jwt.types';

/**
 * 跳过作用域检查的装饰器 key
 */
export const SKIP_SCOPE_CHECK_KEY = 'skipScopeCheck';

/**
 * 团队成员服务接口（用于验证用户是否属于指定团队）
 */
export interface ITeamMembershipService {
  isTeamMember(userId: string, teamId: string): Promise<boolean>;
}

/**
 * 作用域守卫
 *
 * 功能：
 * 1. 验证用户只能访问其作用域内的资源
 * 2. 平台管理员可以访问任何资源
 * 3. 验证 x-team-id header 是否是用户所属的团队
 * 4. 自动注入有效的 scopedTeamId 到请求
 *
 * 使用方式：
 * ```typescript
 * @UseGuards(UnifiedAuthGuard, ScopeGuard)
 * @Controller('links')
 * export class LinkController {
 *   @Get()
 *   findAll(@ScopedTeamId() teamId: string) {
 *     // teamId 是经过验证的安全值
 *   }
 * }
 * ```
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  private readonly reflector = new Reflector();

  constructor(
    @Optional()
    @Inject('TEAM_MEMBERSHIP_SERVICE')
    private readonly teamMembershipService?: ITeamMembershipService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否跳过作用域检查
    const skipScopeCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SCOPE_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipScopeCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    // 平台管理员可以访问任何资源
    if (isPlatformAdmin(user)) {
      // 如果指定了 x-team-id，管理员可以代表该团队操作
      const requestTeamId = this.getRequestTeamId(request);
      if (requestTeamId) {
        request.scopedTeamId = requestTeamId;
      }
      // 标记为管理员访问
      request.isAdminAccess = true;
      return true;
    }

    // 内部 API 调用 (console-service 等内部服务)
    if ((user as any).role === 'INTERNAL') {
      const requestTeamId = this.getRequestTeamId(request);
      if (requestTeamId) {
        request.scopedTeamId = requestTeamId;
      }
      request.isAdminAccess = true;
      return true;
    }

    // 获取用户作用域中的 teamId
    const userTeamId = user.scope?.teamId;
    if (!userTeamId) {
      throw new ForbiddenException('用户没有关联的团队');
    }

    // 获取请求中指定的 teamId
    const requestTeamId = this.getRequestTeamId(request);

    // 如果请求指定了不同的 teamId，需要验证用户是否属于该团队
    if (requestTeamId && requestTeamId !== userTeamId) {
      // 验证用户是否是该团队的成员
      const isMember = await this.checkTeamMembership(user.id, requestTeamId);
      if (!isMember) {
        throw new ForbiddenException('无权访问该团队的资源');
      }
      // 使用请求指定的 teamId
      request.scopedTeamId = requestTeamId;
    } else {
      // 使用用户默认的 teamId
      request.scopedTeamId = userTeamId;
    }

    return true;
  }

  /**
   * 从请求中获取 teamId
   * 优先级：header > query > body > params
   */
  private getRequestTeamId(request: any): string | undefined {
    return (
      request.headers['x-team-id'] ||
      request.query?.teamId ||
      request.body?.teamId ||
      request.params?.teamId
    );
  }

  /**
   * 检查用户是否是团队成员
   */
  private async checkTeamMembership(userId: string, teamId: string): Promise<boolean> {
    if (!this.teamMembershipService) {
      // 如果没有注入服务，默认不允许跨团队访问
      return false;
    }
    return this.teamMembershipService.isTeamMember(userId, teamId);
  }
}

/**
 * 作用域装饰器 - 跳过作用域检查
 */
export function SkipScopeCheck(): MethodDecorator & ClassDecorator {
  return (target: any, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_SCOPE_CHECK_KEY, true, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(SKIP_SCOPE_CHECK_KEY, true, target);
    return target;
  };
}
