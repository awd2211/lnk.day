import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Permission } from './permissions.enum';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_MODE_KEY = 'permissions_mode';

export type PermissionMode = 'all' | 'any';

/**
 * 要求用户拥有所有指定权限
 * @example
 * @RequirePermissions(Permission.LINKS_CREATE)
 * @RequirePermissions(Permission.LINKS_EDIT, Permission.LINKS_DELETE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSIONS_MODE_KEY, 'all' as PermissionMode),
  );

/**
 * 要求用户拥有任意一个指定权限
 * @example
 * @RequireAnyPermission(Permission.LINKS_EDIT, Permission.LINKS_DELETE)
 */
export const RequireAnyPermission = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSIONS_MODE_KEY, 'any' as PermissionMode),
  );

/**
 * 标记端点为公开访问（跳过权限检查，但仍需认证）
 */
export const PUBLIC_PERMISSION_KEY = 'public_permission';
export const PublicPermission = () => SetMetadata(PUBLIC_PERMISSION_KEY, true);

/**
 * 标记端点仅允许团队所有者访问
 */
export const OWNER_ONLY_KEY = 'owner_only';
export const OwnerOnly = () => SetMetadata(OWNER_ONLY_KEY, true);

/**
 * 标记端点允许资源所有者访问（如链接创建者可以编辑自己的链接）
 */
export const RESOURCE_OWNER_KEY = 'resource_owner';
export const AllowResourceOwner = () => SetMetadata(RESOURCE_OWNER_KEY, true);
