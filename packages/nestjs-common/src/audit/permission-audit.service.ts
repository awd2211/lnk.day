import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/jwt.types';

/**
 * 审计日志操作类型
 */
export type AuditAction =
  | 'PERMISSION_CHECK'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_DENIED'
  | 'ROLE_CHANGED'
  | 'PERMISSION_GRANTED_TO_ROLE'
  | 'PERMISSION_REVOKED_FROM_ROLE'
  | 'CUSTOM_ROLE_CREATED'
  | 'CUSTOM_ROLE_UPDATED'
  | 'CUSTOM_ROLE_DELETED'
  | 'CONDITION_CHECK_PASSED'
  | 'CONDITION_CHECK_FAILED';

/**
 * 审计日志记录
 */
export interface PermissionAuditLog {
  /** 日志 ID */
  id?: string;
  /** 时间戳 */
  timestamp: Date;
  /** 操作类型 */
  action: AuditAction;
  /** 操作结果 */
  result: 'SUCCESS' | 'FAILURE';
  /** 操作用户 ID */
  userId: string;
  /** 操作用户邮箱 */
  userEmail?: string;
  /** 操作用户类型 */
  userType: 'user' | 'admin';
  /** 目标用户 ID（权限变更时） */
  targetUserId?: string;
  /** 目标用户邮箱 */
  targetUserEmail?: string;
  /** 团队 ID */
  teamId?: string;
  /** 涉及的权限 */
  permission?: string;
  /** 涉及的多个权限 */
  permissions?: string[];
  /** 涉及的角色 */
  role?: string;
  /** 涉及的资源类型 */
  resourceType?: string;
  /** 涉及的资源 ID */
  resourceId?: string;
  /** 请求路径 */
  path?: string;
  /** 请求方法 */
  method?: string;
  /** 客户端 IP */
  ip?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 条件权限详情 */
  condition?: {
    field: string;
    operator: string;
    expected: any;
    actual: any;
  };
  /** 额外元数据 */
  metadata?: Record<string, any>;
  /** 错误信息 */
  errorMessage?: string;
}

/**
 * 审计日志存储接口
 */
export interface IAuditLogStore {
  save(log: PermissionAuditLog): Promise<void>;
  saveMany(logs: PermissionAuditLog[]): Promise<void>;
  find(filter: Partial<PermissionAuditLog>, options?: { limit?: number; offset?: number }): Promise<PermissionAuditLog[]>;
  count(filter: Partial<PermissionAuditLog>): Promise<number>;
}

/**
 * 审计日志配置
 */
export interface PermissionAuditConfig {
  /** 是否启用审计 */
  enabled: boolean;
  /** 是否记录成功的权限检查 */
  logSuccessfulChecks: boolean;
  /** 是否记录失败的权限检查 */
  logFailedChecks: boolean;
  /** 是否记录权限变更 */
  logPermissionChanges: boolean;
  /** 批量写入大小 */
  batchSize: number;
  /** 批量写入间隔（毫秒） */
  flushInterval: number;
}

const DEFAULT_CONFIG: PermissionAuditConfig = {
  enabled: true,
  logSuccessfulChecks: false, // 默认不记录成功的检查（太多）
  logFailedChecks: true,
  logPermissionChanges: true,
  batchSize: 100,
  flushInterval: 5000,
};

/**
 * 权限审计日志服务
 *
 * 功能：
 * 1. 记录权限检查结果（成功/失败）
 * 2. 记录权限变更（角色变更、权限授予/撤销）
 * 3. 记录条件权限检查结果
 * 4. 支持批量写入优化性能
 * 5. 支持自定义存储后端
 *
 * 使用方式：
 * ```typescript
 * // 在模块中注册
 * @Module({
 *   providers: [
 *     PermissionAuditService,
 *     { provide: 'AUDIT_LOG_STORE', useClass: PostgresAuditLogStore },
 *   ],
 * })
 *
 * // 在 Guard 或 Service 中使用
 * await auditService.logPermissionDenied(user, ['links:delete'], request);
 * ```
 */
@Injectable()
export class PermissionAuditService {
  private readonly logger = new Logger(PermissionAuditService.name);
  private readonly config: PermissionAuditConfig;
  private buffer: PermissionAuditLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    @Optional() @Inject('AUDIT_LOG_STORE') private readonly store?: IAuditLogStore,
    @Optional() @Inject('PERMISSION_AUDIT_CONFIG') config?: Partial<PermissionAuditConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enabled && this.store) {
      this.startFlushTimer();
    }
  }

  /**
   * 记录权限检查成功
   */
  async logPermissionGranted(
    user: AuthenticatedUser,
    permissions: string[],
    request?: any,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logSuccessfulChecks) {
      return;
    }

    await this.log({
      action: 'PERMISSION_GRANTED',
      result: 'SUCCESS',
      user,
      permissions,
      request,
    });
  }

  /**
   * 记录权限检查失败
   */
  async logPermissionDenied(
    user: AuthenticatedUser,
    permissions: string[],
    missingPermissions: string[],
    request?: any,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logFailedChecks) {
      return;
    }

    await this.log({
      action: 'PERMISSION_DENIED',
      result: 'FAILURE',
      user,
      permissions,
      request,
      metadata: { missingPermissions },
    });
  }

  /**
   * 记录条件权限检查成功
   */
  async logConditionPassed(
    user: AuthenticatedUser,
    permission: string,
    condition: { field: string; operator: string; expected: any; actual: any },
    request?: any,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logSuccessfulChecks) {
      return;
    }

    await this.log({
      action: 'CONDITION_CHECK_PASSED',
      result: 'SUCCESS',
      user,
      permissions: [permission],
      condition,
      request,
    });
  }

  /**
   * 记录条件权限检查失败
   */
  async logConditionFailed(
    user: AuthenticatedUser,
    permission: string,
    condition: { field: string; operator: string; expected: any; actual: any },
    request?: any,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logFailedChecks) {
      return;
    }

    await this.log({
      action: 'CONDITION_CHECK_FAILED',
      result: 'FAILURE',
      user,
      permissions: [permission],
      condition,
      request,
    });
  }

  /**
   * 记录角色变更
   */
  async logRoleChanged(
    operator: AuthenticatedUser,
    targetUserId: string,
    targetUserEmail: string,
    oldRole: string,
    newRole: string,
    teamId?: string,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logPermissionChanges) {
      return;
    }

    await this.log({
      action: 'ROLE_CHANGED',
      result: 'SUCCESS',
      user: operator,
      targetUserId,
      targetUserEmail,
      teamId,
      metadata: { oldRole, newRole },
    });
  }

  /**
   * 记录权限授予
   */
  async logPermissionGrantedToRole(
    operator: AuthenticatedUser,
    role: string,
    permissions: string[],
    teamId?: string,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logPermissionChanges) {
      return;
    }

    await this.log({
      action: 'PERMISSION_GRANTED_TO_ROLE',
      result: 'SUCCESS',
      user: operator,
      role,
      permissions,
      teamId,
    });
  }

  /**
   * 记录权限撤销
   */
  async logPermissionRevokedFromRole(
    operator: AuthenticatedUser,
    role: string,
    permissions: string[],
    teamId?: string,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logPermissionChanges) {
      return;
    }

    await this.log({
      action: 'PERMISSION_REVOKED_FROM_ROLE',
      result: 'SUCCESS',
      user: operator,
      role,
      permissions,
      teamId,
    });
  }

  /**
   * 记录自定义角色创建
   */
  async logCustomRoleCreated(
    operator: AuthenticatedUser,
    roleName: string,
    permissions: string[],
    teamId?: string,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logPermissionChanges) {
      return;
    }

    await this.log({
      action: 'CUSTOM_ROLE_CREATED',
      result: 'SUCCESS',
      user: operator,
      role: roleName,
      permissions,
      teamId,
    });
  }

  /**
   * 记录自定义角色更新
   */
  async logCustomRoleUpdated(
    operator: AuthenticatedUser,
    roleName: string,
    oldPermissions: string[],
    newPermissions: string[],
    teamId?: string,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logPermissionChanges) {
      return;
    }

    await this.log({
      action: 'CUSTOM_ROLE_UPDATED',
      result: 'SUCCESS',
      user: operator,
      role: roleName,
      permissions: newPermissions,
      teamId,
      metadata: { oldPermissions, newPermissions },
    });
  }

  /**
   * 记录自定义角色删除
   */
  async logCustomRoleDeleted(
    operator: AuthenticatedUser,
    roleName: string,
    teamId?: string,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logPermissionChanges) {
      return;
    }

    await this.log({
      action: 'CUSTOM_ROLE_DELETED',
      result: 'SUCCESS',
      user: operator,
      role: roleName,
      teamId,
    });
  }

  /**
   * 查询审计日志
   */
  async findLogs(
    filter: Partial<PermissionAuditLog>,
    options?: { limit?: number; offset?: number },
  ): Promise<PermissionAuditLog[]> {
    if (!this.store) {
      return [];
    }
    return this.store.find(filter, options);
  }

  /**
   * 统计审计日志
   */
  async countLogs(filter: Partial<PermissionAuditLog>): Promise<number> {
    if (!this.store) {
      return 0;
    }
    return this.store.count(filter);
  }

  /**
   * 手动刷新缓冲区
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.store) {
      return;
    }

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await this.store.saveMany(logs);
    } catch (error) {
      this.logger.error('Failed to flush audit logs', error);
      // 失败时将日志放回缓冲区
      this.buffer.unshift(...logs);
    }
  }

  /**
   * 销毁服务
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // 同步刷新剩余日志
    this.flush().catch(err => this.logger.error('Failed to flush on destroy', err));
  }

  // ========== 私有方法 ==========

  private async log(params: {
    action: AuditAction;
    result: 'SUCCESS' | 'FAILURE';
    user: AuthenticatedUser;
    permissions?: string[];
    permission?: string;
    condition?: { field: string; operator: string; expected: any; actual: any };
    request?: any;
    targetUserId?: string;
    targetUserEmail?: string;
    teamId?: string;
    role?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const log: PermissionAuditLog = {
      timestamp: new Date(),
      action: params.action,
      result: params.result,
      userId: params.user.id,
      userEmail: params.user.email,
      userType: params.user.type,
      teamId: params.teamId || params.user.scope?.teamId,
      permission: params.permission,
      permissions: params.permissions,
      role: params.role,
      targetUserId: params.targetUserId,
      targetUserEmail: params.targetUserEmail,
      condition: params.condition,
      metadata: params.metadata,
    };

    // 从请求中提取信息
    if (params.request) {
      log.path = params.request.path || params.request.url;
      log.method = params.request.method;
      log.ip = this.getClientIp(params.request);
      log.userAgent = params.request.headers?.['user-agent'];

      // 提取资源信息
      if (params.request.params?.id) {
        log.resourceId = params.request.params.id;
      }
      if (params.request.resource) {
        log.resourceType = params.request.resource.constructor?.name;
      }
    }

    // 添加到缓冲区
    this.buffer.push(log);

    // 如果缓冲区满了，立即刷新
    if (this.buffer.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  private getClientIp(request: any): string {
    return (
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers?.['x-real-ip'] ||
      request.ip ||
      request.connection?.remoteAddress ||
      'unknown'
    );
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => this.logger.error('Failed to flush audit logs', err));
    }, this.config.flushInterval);
  }
}

/**
 * 内存审计日志存储（用于开发/测试）
 */
@Injectable()
export class InMemoryAuditLogStore implements IAuditLogStore {
  private logs: PermissionAuditLog[] = [];
  private idCounter = 0;

  async save(log: PermissionAuditLog): Promise<void> {
    log.id = String(++this.idCounter);
    this.logs.push(log);
  }

  async saveMany(logs: PermissionAuditLog[]): Promise<void> {
    for (const log of logs) {
      log.id = String(++this.idCounter);
    }
    this.logs.push(...logs);
  }

  async find(
    filter: Partial<PermissionAuditLog>,
    options?: { limit?: number; offset?: number },
  ): Promise<PermissionAuditLog[]> {
    let results = this.logs.filter(log => {
      for (const [key, value] of Object.entries(filter)) {
        if (log[key as keyof PermissionAuditLog] !== value) {
          return false;
        }
      }
      return true;
    });

    // 按时间倒序
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    return results.slice(offset, offset + limit);
  }

  async count(filter: Partial<PermissionAuditLog>): Promise<number> {
    const results = await this.find(filter, { limit: Number.MAX_SAFE_INTEGER });
    return results.length;
  }

  // 用于测试
  clear(): void {
    this.logs = [];
    this.idCounter = 0;
  }

  getAll(): PermissionAuditLog[] {
    return [...this.logs];
  }
}
