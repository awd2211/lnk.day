import { SetMetadata } from '@nestjs/common';
import { ActorType } from '../entities/audit-log.entity';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  /**
   * 操作类型，如 'admin.create', 'user.delete', 'system.config.update'
   */
  action: string;

  /**
   * 目标类型，如 'admin', 'user', 'team', 'link', 'config'
   */
  targetType?: string;

  /**
   * 从请求参数中获取目标ID的字段名，默认为 'id'
   */
  targetIdParam?: string;

  /**
   * 从结果中获取目标信息的函数
   * @param result - 方法执行的返回结果
   * @param args - 方法的参数
   * @returns { id?: string; name?: string } 目标信息
   */
  getTarget?: (result: any, args: any[]) => { id?: string; name?: string } | null;

  /**
   * 从请求体/参数中获取要记录的详情字段
   * 如 ['email', 'role'] 会记录 { email: 'xxx', role: 'xxx' }
   */
  detailFields?: string[];

  /**
   * 自定义获取详情的函数
   */
  getDetails?: (args: any[], result: any) => Record<string, any>;

  /**
   * 操作描述模板，支持变量替换
   * 如 '删除了用户 {{targetName}}'
   */
  description?: string;

  /**
   * 是否记录请求体（敏感操作建议设为 false）
   * @default false
   */
  logRequestBody?: boolean;

  /**
   * 需要从请求体中排除的敏感字段
   */
  excludeFields?: string[];
}

/**
 * 审计日志装饰器
 *
 * @example
 * ```typescript
 * @LogAudit({
 *   action: 'admin.create',
 *   targetType: 'admin',
 *   getTarget: (result) => ({ id: result.id, name: result.name }),
 *   detailFields: ['email', 'role'],
 * })
 * async createAdmin(dto: CreateAdminDto) { ... }
 * ```
 */
export const LogAudit = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options);

// Alias for backward compatibility
export const AuditLogDecorator = LogAudit;
