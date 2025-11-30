import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  CustomRole,
  Permission,
  PRESET_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
} from './entities/custom-role.entity';
import { TeamMember, TeamMemberRole } from './entities/team-member.entity';

// 缓存预设角色权限
interface PresetRoleCache {
  permissions: Record<string, string[]>;
  lastFetched: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟缓存

export interface CreateRoleDto {
  name: string;
  description?: string;
  color?: string;
  permissions: Permission[];
  isDefault?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  color?: string;
  permissions?: Permission[];
  isDefault?: boolean;
}

@Injectable()
export class RoleService implements OnModuleInit {
  private readonly logger = new Logger(RoleService.name);
  private presetRoleCache: PresetRoleCache | null = null;
  private readonly consoleServiceUrl: string;

  constructor(
    @InjectRepository(CustomRole)
    private readonly roleRepository: Repository<CustomRole>,
    @InjectRepository(TeamMember)
    private readonly memberRepository: Repository<TeamMember>,
    private readonly httpService: HttpService,
  ) {
    this.consoleServiceUrl = process.env.CONSOLE_SERVICE_URL || 'http://localhost:60009';
  }

  async onModuleInit() {
    // 启动时预加载预设角色权限
    await this.refreshPresetRoleCache();
  }

  /**
   * 从 console-service 获取预设角色权限（带缓存）
   */
  private async getPresetRolePermissions(role: string): Promise<Permission[]> {
    // 检查缓存是否有效
    const now = Date.now();
    if (this.presetRoleCache && (now - this.presetRoleCache.lastFetched) < CACHE_TTL_MS) {
      return (this.presetRoleCache.permissions[role] || []) as Permission[];
    }

    // 刷新缓存
    await this.refreshPresetRoleCache();
    return (this.presetRoleCache?.permissions[role] || PRESET_ROLE_PERMISSIONS[role] || []) as Permission[];
  }

  /**
   * 刷新预设角色缓存
   */
  private async refreshPresetRoleCache(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.consoleServiceUrl}/api/v1/system/preset-roles-internal`, {
          timeout: 5000,
        }),
      );

      const presets = response.data?.presets || [];
      const permissions: Record<string, string[]> = {};

      for (const preset of presets) {
        permissions[preset.name] = preset.permissions;
      }

      this.presetRoleCache = {
        permissions,
        lastFetched: Date.now(),
      };

      this.logger.log('Preset role permissions refreshed from console-service');
    } catch (error: any) {
      this.logger.warn(`Failed to fetch preset roles from console-service, using defaults: ${error?.message || error}`);
      // 使用硬编码的默认值作为后备
      if (!this.presetRoleCache) {
        this.presetRoleCache = {
          permissions: Object.fromEntries(
            Object.entries(PRESET_ROLE_PERMISSIONS).map(([k, v]) => [k, v as string[]]),
          ),
          lastFetched: Date.now(),
        };
      }
    }
  }

  // ========== 角色 CRUD ==========

  async create(teamId: string, dto: CreateRoleDto): Promise<CustomRole> {
    // 检查角色名是否已存在
    const existing = await this.roleRepository.findOne({
      where: { teamId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('角色名称已存在');
    }

    // 验证权限
    const invalidPermissions = dto.permissions.filter(
      (p) => !Object.values(Permission).includes(p),
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(`无效的权限: ${invalidPermissions.join(', ')}`);
    }

    // 如果设置为默认角色，取消其他默认角色
    if (dto.isDefault) {
      await this.roleRepository.update({ teamId, isDefault: true }, { isDefault: false });
    }

    const role = this.roleRepository.create({
      teamId,
      ...dto,
      canBeDeleted: true,
    });

    return this.roleRepository.save(role);
  }

  async findAll(teamId: string): Promise<CustomRole[]> {
    return this.roleRepository.find({
      where: { teamId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string, teamId: string): Promise<CustomRole> {
    const role = await this.roleRepository.findOne({
      where: { id, teamId },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    return role;
  }

  async update(id: string, teamId: string, dto: UpdateRoleDto): Promise<CustomRole> {
    const role = await this.findOne(id, teamId);

    // 检查角色名冲突
    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { teamId, name: dto.name },
      });
      if (existing) {
        throw new BadRequestException('角色名称已存在');
      }
    }

    // 验证权限
    if (dto.permissions) {
      const invalidPermissions = dto.permissions.filter(
        (p) => !Object.values(Permission).includes(p),
      );
      if (invalidPermissions.length > 0) {
        throw new BadRequestException(`无效的权限: ${invalidPermissions.join(', ')}`);
      }
    }

    // 如果设置为默认角色，取消其他默认角色
    if (dto.isDefault && !role.isDefault) {
      await this.roleRepository.update({ teamId, isDefault: true }, { isDefault: false });
    }

    Object.assign(role, dto);
    return this.roleRepository.save(role);
  }

  async delete(id: string, teamId: string): Promise<void> {
    const role = await this.findOne(id, teamId);

    if (!role.canBeDeleted) {
      throw new ForbiddenException('此角色无法删除');
    }

    // 检查是否有成员使用此角色
    const membersWithRole = await this.memberRepository.count({
      where: { teamId, customRoleId: id } as any,
    });

    if (membersWithRole > 0) {
      throw new BadRequestException(`有 ${membersWithRole} 个成员正在使用此角色，请先更改他们的角色`);
    }

    await this.roleRepository.remove(role);
  }

  // ========== 权限检查 ==========

  async getMemberPermissions(memberId: string): Promise<Permission[]> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!member) {
      return [];
    }

    // 如果有自定义角色
    if ((member as any).customRoleId) {
      const customRole = await this.roleRepository.findOne({
        where: { id: (member as any).customRoleId },
      });
      return customRole?.permissions || [];
    }

    // 使用预设角色（从 console-service 获取配置）
    return this.getPresetRolePermissions(member.role);
  }

  async hasPermission(memberId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getMemberPermissions(memberId);
    return permissions.includes(permission);
  }

  async hasAnyPermission(memberId: string, permissions: Permission[]): Promise<boolean> {
    const memberPermissions = await this.getMemberPermissions(memberId);
    return permissions.some((p) => memberPermissions.includes(p));
  }

  async hasAllPermissions(memberId: string, permissions: Permission[]): Promise<boolean> {
    const memberPermissions = await this.getMemberPermissions(memberId);
    return permissions.every((p) => memberPermissions.includes(p));
  }

  // ========== 初始化预设角色 ==========

  async initializeDefaultRoles(teamId: string): Promise<void> {
    const existingRoles = await this.roleRepository.count({ where: { teamId } });
    if (existingRoles > 0) {
      return; // 已有角色，不再初始化
    }

    // 从 console-service 获取最新的预设权限
    const adminPerms = await this.getPresetRolePermissions('ADMIN');
    const memberPerms = await this.getPresetRolePermissions('MEMBER');
    const viewerPerms = await this.getPresetRolePermissions('VIEWER');

    const presetRoles = [
      {
        name: '管理员',
        description: '完全管理权限，除账单外',
        color: '#3B82F6',
        permissions: adminPerms,
        canBeDeleted: false,
      },
      {
        name: '成员',
        description: '创建和编辑内容',
        color: '#10B981',
        permissions: memberPerms,
        isDefault: true,
        canBeDeleted: false,
      },
      {
        name: '查看者',
        description: '仅查看权限',
        color: '#6B7280',
        permissions: viewerPerms,
        canBeDeleted: false,
      },
    ];

    for (const roleData of presetRoles) {
      const role = this.roleRepository.create({
        teamId,
        ...roleData,
      });
      await this.roleRepository.save(role);
    }
  }

  // ========== 辅助方法 ==========

  async getAvailablePermissions() {
    // 确保缓存是最新的
    await this.refreshPresetRoleCache();

    const presets = this.presetRoleCache
      ? Object.entries(this.presetRoleCache.permissions).map(([name, permissions]) => ({
          name,
          permissions,
        }))
      : Object.entries(PRESET_ROLE_PERMISSIONS).map(([name, permissions]) => ({
          name,
          permissions: permissions as string[],
        }));

    return {
      permissions: Object.values(Permission),
      groups: PERMISSION_GROUPS,
      presets,
    };
  }

  /**
   * 手动刷新预设角色缓存（可在后台修改权限后调用）
   */
  async invalidatePresetRoleCache(): Promise<void> {
    this.presetRoleCache = null;
    await this.refreshPresetRoleCache();
  }

  async getDefaultRole(teamId: string): Promise<CustomRole | null> {
    return this.roleRepository.findOne({
      where: { teamId, isDefault: true },
    });
  }

  async duplicateRole(id: string, teamId: string, newName: string): Promise<CustomRole> {
    const sourceRole = await this.findOne(id, teamId);

    return this.create(teamId, {
      name: newName,
      description: sourceRole.description,
      color: sourceRole.color,
      permissions: sourceRole.permissions,
    });
  }
}
