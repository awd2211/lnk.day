// ============================================================================
// 用户类型
// ============================================================================

/**
 * 用户类型
 */
export type UserType = 'user' | 'admin';

/**
 * 作用域级别
 * - platform: 平台级别（管理员），可访问所有资源
 * - team: 团队级别，只能访问指定团队的资源
 * - personal: 个人级别，只能访问个人资源（teamId = userId）
 */
export type ScopeLevel = 'platform' | 'team' | 'personal';

/**
 * 作用域定义
 */
export interface Scope {
  /** 作用域级别 */
  level: ScopeLevel;
  /** 团队 ID（team/personal 级别必填） */
  teamId?: string;
}

// ============================================================================
// JWT Payload
// ============================================================================

/**
 * 统一 JWT Payload 结构
 * 支持普通用户和平台管理员两种类型
 *
 * 设计原则：
 * - Token 只存储角色，不存储完整权限列表（减小 Token 体积）
 * - 权限由服务端根据角色实时计算（支持热更新）
 * - 权限版本号用于失效旧 Token
 */
export interface UnifiedJwtPayload {
  // === 基础字段 ===
  /** 用户 ID (users.id 或 admins.id) */
  sub: string;
  /** 用户邮箱 */
  email: string;
  /** 用户名称 */
  name?: string;

  // === 用户类型 ===
  /** 用户类型：user=普通用户, admin=平台管理员 */
  type: UserType;

  // === 作用域 ===
  /** 作用域定义 */
  scope: Scope;

  // === 角色 ===
  /**
   * 角色
   * - 普通用户: OWNER | ADMIN | MEMBER | VIEWER
   * - 管理员: SUPER_ADMIN | ADMIN | OPERATOR
   */
  role: string;

  /**
   * 自定义角色 ID（如果使用自定义角色）
   * 当设置此字段时，权限从自定义角色获取而非预设角色
   */
  customRoleId?: string;

  /**
   * 权限列表（可选，向后兼容）
   * @deprecated 推荐使用服务端实时计算权限，不在 Token 中存储
   */
  permissions?: string[];

  // === 权限版本（用于实时失效）===
  /** 权限版本号，变更时递增 */
  pv?: number;

  // === 标准 JWT 字段 ===
  /** 签发时间 */
  iat?: number;
  /** 过期时间 */
  exp?: number;
}

// ============================================================================
// 认证用户对象
// ============================================================================

/**
 * 认证后的用户对象（附加到 request.user）
 */
export interface AuthenticatedUser extends UnifiedJwtPayload {
  /** 用户 ID（从 sub 复制，方便使用） */
  id: string;
}

// ============================================================================
// 角色定义
// ============================================================================

/**
 * 团队成员角色
 */
export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * 平台管理员角色
 */
export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

/**
 * 团队角色优先级（数字越大权限越高）
 */
export const TEAM_ROLE_PRIORITY: Record<string, number> = {
  [TeamRole.VIEWER]: 1,
  [TeamRole.MEMBER]: 2,
  [TeamRole.ADMIN]: 3,
  [TeamRole.OWNER]: 4,
};

/**
 * 管理员角色优先级（数字越大权限越高）
 */
export const ADMIN_ROLE_PRIORITY: Record<string, number> = {
  [AdminRole.OPERATOR]: 1,
  [AdminRole.ADMIN]: 2,
  [AdminRole.SUPER_ADMIN]: 3,
};

/**
 * 获取角色优先级
 */
export function getRolePriority(role: string, type: UserType): number {
  if (type === 'admin') {
    return ADMIN_ROLE_PRIORITY[role] ?? 0;
  }
  return TEAM_ROLE_PRIORITY[role] ?? 0;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 检查是否是平台管理员
 */
export function isPlatformAdmin(user: AuthenticatedUser): boolean {
  return user.type === 'admin' && user.scope?.level === 'platform';
}

/**
 * 检查是否是团队所有者
 */
export function isTeamOwner(user: AuthenticatedUser): boolean {
  return user.role === TeamRole.OWNER;
}

/**
 * 检查是否是超级管理员
 */
export function isSuperAdmin(user: AuthenticatedUser): boolean {
  return user.type === 'admin' && user.role === AdminRole.SUPER_ADMIN;
}

/**
 * 获取用户的有效 teamId
 */
export function getEffectiveTeamId(user: AuthenticatedUser): string | undefined {
  if (user.scope?.level === 'platform') {
    return undefined; // 平台级别无特定团队
  }
  return user.scope?.teamId;
}

// ============================================================================
// 兼容旧版（逐步废弃）
// ============================================================================

/**
 * @deprecated 使用 UnifiedJwtPayload 替代
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  teamId?: string;
  teamRole?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
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
