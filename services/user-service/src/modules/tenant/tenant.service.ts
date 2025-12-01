import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import * as crypto from 'crypto';
import {
  Tenant,
  TenantMember,
  TenantInvitation,
  TenantAuditLog,
  TenantApiKey,
  TenantStatus,
  TenantType,
} from './entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantMember)
    private memberRepo: Repository<TenantMember>,
    @InjectRepository(TenantInvitation)
    private invitationRepo: Repository<TenantInvitation>,
    @InjectRepository(TenantAuditLog)
    private auditLogRepo: Repository<TenantAuditLog>,
    @InjectRepository(TenantApiKey)
    private apiKeyRepo: Repository<TenantApiKey>,
  ) {}

  // ==================== Tenant CRUD ====================

  async createTenant(
    data: Partial<Tenant>,
    ownerId: string,
  ): Promise<Tenant> {
    // 生成唯一 slug
    const baseSlug = this.generateSlug(data.name || 'tenant');
    const slug = await this.ensureUniqueSlug(baseSlug);

    const tenant = this.tenantRepo.create({
      ...data,
      slug,
      ownerId,
      status: data.status || TenantStatus.ACTIVE,
      type: data.type || TenantType.TEAM,
    });

    const savedTenant = await this.tenantRepo.save(tenant);

    // 添加所有者作为成员
    await this.memberRepo.save({
      tenantId: savedTenant.id,
      userId: ownerId,
      role: 'owner',
      permissions: ['*'],
      joinedAt: new Date(),
      isActive: true,
    });

    // 记录审计日志
    await this.logAction(savedTenant.id, ownerId, 'tenant.created', 'tenant', savedTenant.id);

    return savedTenant;
  }

  async updateTenant(
    id: string,
    data: Partial<Tenant>,
    userId: string,
  ): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // 检查权限
    await this.checkPermission(id, userId, 'tenant.update');

    // 如果更新 slug，确保唯一性
    if (data.slug && data.slug !== tenant.slug) {
      const existing = await this.tenantRepo.findOne({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ConflictException('Slug already in use');
      }
    }

    Object.assign(tenant, data);
    const savedTenant = await this.tenantRepo.save(tenant);

    await this.logAction(id, userId, 'tenant.updated', 'tenant', id, data);

    return savedTenant;
  }

  async getTenant(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async getTenantsByUser(userId: string): Promise<Tenant[]> {
    const memberships = await this.memberRepo.find({
      where: { userId, isActive: true },
    });

    if (memberships.length === 0) {
      return [];
    }

    const tenantIds = memberships.map((m) => m.tenantId);
    return this.tenantRepo.find({
      where: { id: In(tenantIds) },
    });
  }

  async deleteTenant(id: string, userId: string): Promise<void> {
    const tenant = await this.getTenant(id);

    // 只有所有者可以删除
    if (tenant.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete the tenant');
    }

    await this.tenantRepo.remove(tenant);
    await this.logAction(id, userId, 'tenant.deleted', 'tenant', id);
  }

  // ==================== Branding ====================

  async updateBranding(
    tenantId: string,
    branding: Tenant['branding'],
    userId: string,
  ): Promise<Tenant> {
    await this.checkPermission(tenantId, userId, 'branding.update');

    const tenant = await this.getTenant(tenantId);
    tenant.branding = { ...tenant.branding, ...branding };
    const savedTenant = await this.tenantRepo.save(tenant);

    await this.logAction(tenantId, userId, 'branding.updated', 'tenant', tenantId, branding);

    return savedTenant;
  }

  async getBranding(tenantId: string): Promise<Tenant['branding']> {
    const tenant = await this.getTenant(tenantId);
    return tenant.branding || {};
  }

  // ==================== Settings ====================

  async updateSettings(
    tenantId: string,
    settings: Tenant['settings'],
    userId: string,
  ): Promise<Tenant> {
    await this.checkPermission(tenantId, userId, 'settings.update');

    const tenant = await this.getTenant(tenantId);
    tenant.settings = { ...tenant.settings, ...settings };
    const savedTenant = await this.tenantRepo.save(tenant);

    await this.logAction(tenantId, userId, 'settings.updated', 'tenant', tenantId, settings);

    return savedTenant;
  }

  async updateFeatures(
    tenantId: string,
    features: Tenant['features'],
    userId: string,
  ): Promise<Tenant> {
    await this.checkPermission(tenantId, userId, 'features.update');

    const tenant = await this.getTenant(tenantId);
    tenant.features = { ...tenant.features, ...features };
    const savedTenant = await this.tenantRepo.save(tenant);

    await this.logAction(tenantId, userId, 'features.updated', 'tenant', tenantId, features);

    return savedTenant;
  }

  // ==================== Members ====================

  async getMembers(tenantId: string): Promise<TenantMember[]> {
    return this.memberRepo.find({
      where: { tenantId, isActive: true },
      order: { joinedAt: 'DESC' },
    });
  }

  async getMember(tenantId: string, userId: string): Promise<TenantMember | null> {
    return this.memberRepo.findOne({
      where: { tenantId, userId, isActive: true },
    });
  }

  async updateMemberRole(
    tenantId: string,
    memberId: string,
    role: string,
    permissions: string[],
    actorId: string,
  ): Promise<TenantMember> {
    await this.checkPermission(tenantId, actorId, 'members.update');

    const member = await this.memberRepo.findOne({
      where: { id: memberId, tenantId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // 不能更改所有者角色
    const tenant = await this.getTenant(tenantId);
    if (member.userId === tenant.ownerId && role !== 'owner') {
      throw new BadRequestException('Cannot change owner role');
    }

    member.role = role;
    member.permissions = permissions;
    const savedMember = await this.memberRepo.save(member);

    await this.logAction(tenantId, actorId, 'member.role_updated', 'member', memberId, { role, permissions });

    return savedMember;
  }

  async removeMember(
    tenantId: string,
    memberId: string,
    actorId: string,
  ): Promise<void> {
    await this.checkPermission(tenantId, actorId, 'members.remove');

    const member = await this.memberRepo.findOne({
      where: { id: memberId, tenantId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // 不能移除所有者
    const tenant = await this.getTenant(tenantId);
    if (member.userId === tenant.ownerId) {
      throw new BadRequestException('Cannot remove the owner');
    }

    member.isActive = false;
    await this.memberRepo.save(member);

    await this.logAction(tenantId, actorId, 'member.removed', 'member', memberId);
  }

  // ==================== Invitations ====================

  async createInvitation(
    tenantId: string,
    email: string,
    role: string,
    permissions: string[],
    invitedBy: string,
  ): Promise<TenantInvitation> {
    await this.checkPermission(tenantId, invitedBy, 'members.invite');

    // 检查是否已经是成员
    const existingMember = await this.memberRepo.findOne({
      where: { tenantId, userId: email },
    });
    if (existingMember) {
      throw new ConflictException('User is already a member');
    }

    // 检查是否已有邀请
    const existingInvitation = await this.invitationRepo.findOne({
      where: { tenantId, email, acceptedAt: null },
    });
    if (existingInvitation) {
      throw new ConflictException('Invitation already sent');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = this.invitationRepo.create({
      tenantId,
      email,
      role,
      permissions,
      token,
      invitedBy,
      expiresAt,
    });

    const savedInvitation = await this.invitationRepo.save(invitation);

    await this.logAction(tenantId, invitedBy, 'invitation.created', 'invitation', savedInvitation.id, { email, role });

    return savedInvitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<TenantMember> {
    const invitation = await this.invitationRepo.findOne({
      where: { token, acceptedAt: null },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already accepted');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // 创建成员
    const member = this.memberRepo.create({
      tenantId: invitation.tenantId,
      userId,
      role: invitation.role,
      permissions: invitation.permissions,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt,
      joinedAt: new Date(),
      isActive: true,
    });

    const savedMember = await this.memberRepo.save(member);

    // 标记邀请为已接受
    invitation.acceptedAt = new Date();
    await this.invitationRepo.save(invitation);

    await this.logAction(invitation.tenantId, userId, 'invitation.accepted', 'invitation', invitation.id);

    return savedMember;
  }

  async cancelInvitation(
    tenantId: string,
    invitationId: string,
    userId: string,
  ): Promise<void> {
    await this.checkPermission(tenantId, userId, 'members.invite');

    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.invitationRepo.remove(invitation);

    await this.logAction(tenantId, userId, 'invitation.cancelled', 'invitation', invitationId);
  }

  async getPendingInvitations(tenantId: string): Promise<TenantInvitation[]> {
    return this.invitationRepo.find({
      where: { tenantId, acceptedAt: null },
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== API Keys ====================

  async createApiKey(
    tenantId: string,
    data: {
      name: string;
      permissions?: string[];
      scopes?: string[];
      rateLimit?: number;
      ipWhitelist?: string[];
      expiresAt?: Date;
    },
    createdBy: string,
  ): Promise<{ apiKey: TenantApiKey; rawKey: string }> {
    await this.checkPermission(tenantId, createdBy, 'api_keys.create');

    // 生成 API Key
    const rawKey = `lnk_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = this.apiKeyRepo.create({
      tenantId,
      name: data.name,
      keyPrefix,
      keyHash,
      permissions: data.permissions || ['read'],
      scopes: data.scopes || ['links', 'analytics'],
      rateLimit: data.rateLimit || 1000,
      ipWhitelist: data.ipWhitelist,
      expiresAt: data.expiresAt,
      createdBy,
      isActive: true,
    });

    const savedApiKey = await this.apiKeyRepo.save(apiKey);

    await this.logAction(tenantId, createdBy, 'api_key.created', 'api_key', savedApiKey.id, { name: data.name });

    return { apiKey: savedApiKey, rawKey };
  }

  async getApiKeys(tenantId: string): Promise<TenantApiKey[]> {
    return this.apiKeyRepo.find({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeApiKey(
    tenantId: string,
    apiKeyId: string,
    userId: string,
  ): Promise<void> {
    await this.checkPermission(tenantId, userId, 'api_keys.revoke');

    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: apiKeyId, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    apiKey.isActive = false;
    await this.apiKeyRepo.save(apiKey);

    await this.logAction(tenantId, userId, 'api_key.revoked', 'api_key', apiKeyId);
  }

  async validateApiKey(rawKey: string): Promise<{ tenant: Tenant; apiKey: TenantApiKey } | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.apiKeyRepo.findOne({
      where: { keyHash, isActive: true },
    });

    if (!apiKey) {
      return null;
    }

    // 检查是否过期
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    const tenant = await this.tenantRepo.findOne({
      where: { id: apiKey.tenantId },
    });

    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      return null;
    }

    // 更新最后使用时间
    apiKey.lastUsedAt = new Date();
    await this.apiKeyRepo.save(apiKey);

    return { tenant, apiKey };
  }

  // ==================== Audit Logs ====================

  async getAuditLogs(
    tenantId: string,
    options?: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: TenantAuditLog[]; total: number }> {
    const queryBuilder = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId });

    if (options?.userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId: options.userId });
    }

    if (options?.action) {
      queryBuilder.andWhere('log.action = :action', { action: options.action });
    }

    if (options?.resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', {
        resourceType: options.resourceType,
      });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .take(options?.limit || 50)
      .skip(options?.offset || 0);

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  // ==================== Sub-Tenants ====================

  async getSubTenants(parentTenantId: string): Promise<Tenant[]> {
    return this.tenantRepo.find({
      where: { parentTenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async createSubTenant(
    parentTenantId: string,
    data: Partial<Tenant>,
    ownerId: string,
    actorId: string,
  ): Promise<Tenant> {
    await this.checkPermission(parentTenantId, actorId, 'sub_tenants.create');

    const parentTenant = await this.getTenant(parentTenantId);

    // 检查父租户是否允许子账户
    if (!parentTenant.features?.subAccounts) {
      throw new ForbiddenException('Sub-accounts are not enabled for this tenant');
    }

    const tenant = await this.createTenant(
      {
        ...data,
        parentTenantId,
        type: TenantType.TEAM,
      },
      ownerId,
    );

    await this.logAction(parentTenantId, actorId, 'sub_tenant.created', 'tenant', tenant.id);

    return tenant;
  }

  // ==================== Helper Methods ====================

  private async checkPermission(
    tenantId: string,
    userId: string,
    permission: string,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { tenantId, userId, isActive: true },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this tenant');
    }

    // 所有者拥有所有权限
    if (member.role === 'owner') {
      return;
    }

    // 管理员拥有大部分权限
    if (member.role === 'admin') {
      const adminRestrictedPermissions = ['tenant.delete', 'ownership.transfer'];
      if (!adminRestrictedPermissions.includes(permission)) {
        return;
      }
    }

    // 检查特定权限
    if (member.permissions?.includes('*') || member.permissions?.includes(permission)) {
      return;
    }

    throw new ForbiddenException('Permission denied');
  }

  private async logAction(
    tenantId: string,
    userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    try {
      const log = this.auditLogRepo.create({
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
      });
      await this.auditLogRepo.save(log);
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.tenantRepo.findOne({ where: { slug } });
      if (!existing) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // ==================== Statistics ====================

  async getTenantStats(tenantId: string): Promise<{
    members: number;
    pendingInvitations: number;
    apiKeys: number;
    auditLogsToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [members, pendingInvitations, apiKeys, auditLogsToday] = await Promise.all([
      this.memberRepo.count({ where: { tenantId, isActive: true } }),
      this.invitationRepo.count({ where: { tenantId, acceptedAt: null } }),
      this.apiKeyRepo.count({ where: { tenantId, isActive: true } }),
      this.auditLogRepo
        .createQueryBuilder('log')
        .where('log.tenantId = :tenantId', { tenantId })
        .andWhere('log.createdAt >= :today', { today })
        .getCount(),
    ]);

    return { members, pendingInvitations, apiKeys, auditLogsToday };
  }
}
