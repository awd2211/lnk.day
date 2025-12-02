import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminRoleEntity,
  AdminPermission,
  ADMIN_PERMISSION_GROUPS,
  DEFAULT_ROLE_PERMISSIONS,
} from './entities/admin-role.entity';
import { Admin } from '../admin/entities/admin.entity';

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
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  /**
   * 初始化默认角色
   */
  async initializeDefaultRoles(): Promise<void> {
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
        name: 'SYSTEM_ADMIN',
        description: '系统管理员，负责技术运维、系统配置、服务管理、备份等',
        color: '#6366F1',
        permissions: DEFAULT_ROLE_PERMISSIONS.SYSTEM_ADMIN,
        isSystem: true,
        priority: 90,
      },
      {
        name: 'OPERATION_MANAGER',
        description: '运营主管，运营团队负责人，内容管理、用户管理、数据分析、审核决策',
        color: '#F59E0B',
        permissions: DEFAULT_ROLE_PERMISSIONS.OPERATION_MANAGER,
        isSystem: true,
        priority: 70,
      },
      {
        name: 'CONTENT_OPERATOR',
        description: '内容运营，日常内容管理，链接、活动、页面、二维码、评论审核',
        color: '#10B981',
        permissions: DEFAULT_ROLE_PERMISSIONS.CONTENT_OPERATOR,
        isSystem: true,
        priority: 50,
      },
      {
        name: 'CUSTOMER_SUPPORT',
        description: '客服专员，用户支持，查看用户/团队，处理用户问题',
        color: '#3B82F6',
        permissions: DEFAULT_ROLE_PERMISSIONS.CUSTOMER_SUPPORT,
        isSystem: true,
        priority: 40,
      },
      {
        name: 'FINANCE',
        description: '财务人员，订阅、计费、发票、套餐管理',
        color: '#EC4899',
        permissions: DEFAULT_ROLE_PERMISSIONS.FINANCE,
        isSystem: true,
        priority: 60,
      },
      {
        name: 'DATA_ANALYST',
        description: '数据分析师，数据分析、报表导出',
        color: '#8B5CF6',
        permissions: DEFAULT_ROLE_PERMISSIONS.DATA_ANALYST,
        isSystem: true,
        priority: 30,
      },
      {
        name: 'AUDITOR',
        description: '审计员，合规审计，审计日志、告警查看',
        color: '#64748B',
        permissions: DEFAULT_ROLE_PERMISSIONS.AUDITOR,
        isSystem: true,
        priority: 20,
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.roleRepository.findOne({ where: { name: roleData.name } });
      if (!existing) {
        await this.roleRepository.save(this.roleRepository.create(roleData));
      } else if (existing.isSystem) {
        // 更新系统角色的权限（保持最新）
        existing.permissions = roleData.permissions;
        existing.description = roleData.description;
        existing.color = roleData.color;
        existing.priority = roleData.priority;
        await this.roleRepository.save(existing);
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

    // 检查是否有管理员正在使用此角色
    const adminsUsingRole = await this.adminRepository.count({ where: { roleId: id } });
    if (adminsUsingRole > 0) {
      throw new BadRequestException(`无法删除角色，当前有 ${adminsUsingRole} 位管理员正在使用此角色`);
    }

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
