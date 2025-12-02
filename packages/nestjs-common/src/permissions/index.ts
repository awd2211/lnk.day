/**
 * 权限模块导出
 *
 * 注意：此模块中的部分内容已迁移到 guards/ 模块
 *
 * 保留导出：
 * - Permission 枚举及辅助函数（仍在使用）
 *
 * 已废弃（请从 guards/ 模块导入）：
 * - PermissionGuard -> import { PermissionGuard } from '@lnk/nestjs-common'
 * - @RequirePermissions -> import { RequirePermissions } from '@lnk/nestjs-common'
 * - @RequireAnyPermission -> import { RequireAnyPermission } from '@lnk/nestjs-common'
 * - @PublicPermission -> import { PublicPermission } from '@lnk/nestjs-common'
 * - @OwnerOnly -> import { OwnerOnly } from '@lnk/nestjs-common'
 * - ResourceOwnerGuard -> import { ResourceAccessGuard } from '@lnk/nestjs-common'
 */

// 权限枚举和辅助函数（保留，仍在使用）
export * from './permissions.enum';

// 权限服务（实时计算权限）
export * from './permission.service';

// 以下为兼容性导出，已标记为废弃
// 保留以支持渐进式迁移，请尽快迁移到 guards/ 模块
