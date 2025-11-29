import { Permission } from '../permissions';

/**
 * JWT Payload 结构
 */
export interface JwtPayload {
  /** 用户 ID */
  sub: string;
  /** 用户邮箱 */
  email: string;
  /** 管理员角色 (console-service) */
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';
  /** 团队 ID */
  teamId?: string;
  /** 团队角色 */
  teamRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  /** 权限列表 */
  permissions?: Permission[];
  /** 签发时间 */
  iat?: number;
  /** 过期时间 */
  exp?: number;
}

/**
 * 认证后的用户对象
 */
export interface AuthenticatedUser {
  /** 用户 ID */
  id: string;
  /** 用户邮箱 */
  email: string;
  /** 团队 ID */
  teamId?: string;
  /** 团队角色 */
  teamRole?: string;
  /** 权限列表 */
  permissions: Permission[];
  /** 是否是控制台管理员 */
  isConsoleAdmin?: boolean;
}

/**
 * JWT 模块配置选项
 */
export interface JwtModuleOptions {
  /** JWT 密钥 */
  secret?: string;
  /** Token 过期时间 */
  expiresIn?: string;
  /** 是否忽略过期 */
  ignoreExpiration?: boolean;
}
