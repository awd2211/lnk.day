import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminRoleEntity,
  AdminPermission,
  ADMIN_PERMISSION_GROUPS,
  DEFAULT_ROLE_PERMISSIONS,
} from './entities/admin-role.entity';

export interface CreateAdminRoleDto {
  name: string;
  description?: string;
  color?: string;
  permissions: string[];
  priority?: number;
}

export interface UpdateAdminRoleDto {
  name?: string;
  description?: string;
  color?: string;
  permissions?: string[];
  priority?: number;
}

@Injectable()
export class AdminRoleService {
  constructor(
    @InjectRepository(AdminRoleEntity)
    private readonly roleRepository: Repository<AdminRoleEntity>,
  ) {}

  /**
   * 初始化默认角色
   */
  async initializeDefaultRoles(): Promise<void> {
    const existingRoles = await this.roleRepository.find({ where: { isSystem: true } });

    if (existingRoles.length === 0) {
      const defaultRoles = [
        {
          name: 'SUPER_ADMIN',
          description: '超级管理员，拥有系统所有权限',
          color: '#EF4444',
          permissions: DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN,
          isSystem: true,
          priority: 100,
        },
        {
          name: 'ADMIN',
          description: '管理员，拥有大部分管理权限',
          color: '#F59E0B',
          permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
          isSystem: true,
          priority: 50,
        },
        {
          name: 'OPERATOR',
          description: '运营人员，拥有只读权限',
          color: '#3B82F6',
          permissions: DEFAULT_ROLE_PERMISSIONS.OPERATOR,
          isSystem: true,
          priority: 10,
        },
      ];

      for (const role of defaultRoles) {
        await this.roleRepository.save(this.roleRepository.create(role));
      }
    }
  }

  /**
   * 获取所有角色
   */
  async findAll(): Promise<AdminRoleEntity[]> {
    return this.roleRepository.find({
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  /**
   * 获取单个角色
   */
  async findOne(id: string): Promise<AdminRoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role;
  }

  /**
   * 根据名称获取角色
   */
  async findByName(name: string): Promise<AdminRoleEntity | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  /**
   * 创建角色
   */
  async create(dto: CreateAdminRoleDto): Promise<AdminRoleEntity> {
    // 检查名称是否重复
    const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('角色名称已存在');
    }

    // 验证权限
    this.validatePermissions(dto.permissions);

    const role = this.roleRepository.create({
      ...dto,
      isSystem: false,
    });

    return this.roleRepository.save(role);
  }

  /**
   * 更新角色
   */
  async update(id: string, dto: UpdateAdminRoleDto): Promise<AdminRoleEntity> {
    const role = await this.findOne(id);

    // 系统角色只能修改权限，不能修改名称
    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new BadRequestException('系统内置角色不能修改名称');
    }

    // 检查名称是否重复
    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
      if (existing) {
        throw new ConflictException('角色名称已存在');
      }
    }

    // 验证权限
    if (dto.permissions) {
      this.validatePermissions(dto.permissions);
    }

    Object.assign(role, dto);
    return this.roleRepository.save(role);
  }

  /**
   * 删除角色
   */
  async delete(id: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('系统内置角色不能删除');
    }

    // TODO: 检查是否有管理员正在使用此角色

    await this.roleRepository.remove(role);
  }

  /**
   * 复制角色
   */
  async duplicate(id: string, newName: string): Promise<AdminRoleEntity> {
    const role = await this.findOne(id);

    // 检查名称是否重复
    const existing = await this.roleRepository.findOne({ where: { name: newName } });
    if (existing) {
      throw new ConflictException('角色名称已存在');
    }

    const newRole = this.roleRepository.create({
      name: newName,
      description: role.description ? `${role.description} (副本)` : undefined,
      color: role.color,
      permissions: [...role.permissions],
      isSystem: false,
      priority: role.priority,
    });

    return this.roleRepository.save(newRole);
  }

  /**
   * 获取所有可用权限
   */
  getAvailablePermissions() {
    return {
      permissions: Object.values(AdminPermission),
      groups: ADMIN_PERMISSION_GROUPS,
    };
  }

  /**
   * 检查权限是否有效
   */
  hasPermission(rolePermissions: string[], permission: string): boolean {
    return rolePermissions.includes(permission);
  }

  /**
   * 检查是否有任意一个权限
   */
  hasAnyPermission(rolePermissions: string[], permissions: string[]): boolean {
    return permissions.some(p => rolePermissions.includes(p));
  }

  /**
   * 检查是否有所有权限
   */
  hasAllPermissions(rolePermissions: string[], permissions: string[]): boolean {
    return permissions.every(p => rolePermissions.includes(p));
  }

  /**
   * 验证权限列表
   */
  private validatePermissions(permissions: string[]): void {
    const validPermissions = Object.values(AdminPermission);
    const invalid = permissions.filter(p => !validPermissions.includes(p as AdminPermission));
    if (invalid.length > 0) {
      throw new BadRequestException(`无效的权限: ${invalid.join(', ')}`);
    }
  }
}
