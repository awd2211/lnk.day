import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';

import { TenantService } from './tenant.service';
import { TenantStatus, TenantType } from './entities/tenant.entity';
import { JwtAuthGuard, CurrentUser, ScopeGuard, RequireScope } from '@lnk/nestjs-common';

@ApiTags('tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ==================== Tenant CRUD ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建租户' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'slug'],
      properties: {
        name: { type: 'string', description: '租户名称' },
        slug: { type: 'string', description: '租户标识（URL友好）' },
        description: { type: 'string' },
        type: { type: 'string', enum: Object.values(TenantType) },
        parentTenantId: { type: 'string', description: '父租户ID（子账户场景）' },
      },
    },
  })
  createTenant(
    @Body() data: {
      name: string;
      slug: string;
      description?: string;
      type?: TenantType;
      parentTenantId?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.tenantService.createTenant({
      ...data,
      ownerId: user.sub,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户所属的所有租户' })
  getUserTenants(@CurrentUser() user: any) {
    return this.tenantService.getUserTenants(user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('team:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取租户详情' })
  getTenant(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.getTenant(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新租户信息' })
  updateTenant(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      description?: string;
      status?: TenantStatus;
    },
    @CurrentUser() user: any,
  ) {
    return this.tenantService.updateTenant(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除租户' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.tenantService.deleteTenant(id);
  }

  // ==================== Branding ====================

  @Put(':id/branding')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新租户品牌配置' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: { type: 'string' },
        logoDark: { type: 'string' },
        favicon: { type: 'string' },
        primaryColor: { type: 'string' },
        secondaryColor: { type: 'string' },
        accentColor: { type: 'string' },
        fontFamily: { type: 'string' },
        customCss: { type: 'string' },
      },
    },
  })
  updateBranding(
    @Param('id') id: string,
    @Body() branding: any,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.updateBranding(id, branding);
  }

  @Get(':id/branding')
  @ApiOperation({ summary: '获取租户品牌配置（公开）' })
  getBranding(@Param('id') id: string) {
    return this.tenantService.getBranding(id);
  }

  // ==================== Settings ====================

  @Put(':id/settings')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新租户设置' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        timezone: { type: 'string' },
        locale: { type: 'string' },
        dateFormat: { type: 'string' },
        currency: { type: 'string' },
        defaultLinkExpiry: { type: 'number' },
        allowPublicSignup: { type: 'boolean' },
        requireEmailVerification: { type: 'boolean' },
        require2FA: { type: 'boolean' },
        ipWhitelist: { type: 'array', items: { type: 'string' } },
        allowedEmailDomains: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  updateSettings(
    @Param('id') id: string,
    @Body() settings: any,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.updateSettings(id, settings);
  }

  @Get(':id/settings')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取租户设置' })
  getSettings(@Param('id') id: string) {
    return this.tenantService.getSettings(id);
  }

  // ==================== Features & Limits ====================

  @Put(':id/features')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新租户功能开关' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        analytics: { type: 'boolean' },
        campaigns: { type: 'boolean' },
        qrCodes: { type: 'boolean' },
        bioLinks: { type: 'boolean' },
        deepLinks: { type: 'boolean' },
        customDomains: { type: 'boolean' },
        apiAccess: { type: 'boolean' },
        webhooks: { type: 'boolean' },
        sso: { type: 'boolean' },
        auditLogs: { type: 'boolean' },
        whiteLabel: { type: 'boolean' },
        subAccounts: { type: 'boolean' },
      },
    },
  })
  updateFeatures(
    @Param('id') id: string,
    @Body() features: any,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.updateFeatures(id, features);
  }

  @Put(':id/limits')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新租户资源限制' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        maxUsers: { type: 'number' },
        maxTeams: { type: 'number' },
        maxLinks: { type: 'number' },
        maxClicks: { type: 'number' },
        maxDomains: { type: 'number' },
        maxApiKeys: { type: 'number' },
        maxWebhooks: { type: 'number' },
        storageQuota: { type: 'number' },
      },
    },
  })
  updateLimits(
    @Param('id') id: string,
    @Body() limits: any,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.updateLimits(id, limits);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取租户资源使用情况' })
  getUsage(@Param('id') id: string) {
    return this.tenantService.getUsage(id);
  }

  // ==================== Domain Configuration ====================

  @Put(':id/domains')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('domains:configure')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新租户域名配置' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        customDomain: { type: 'string', description: '自定义域名' },
        appDomain: { type: 'string', description: '应用域名' },
        shortDomain: { type: 'string', description: '短链域名' },
      },
    },
  })
  updateDomains(
    @Param('id') id: string,
    @Body() domains: {
      customDomain?: string;
      appDomain?: string;
      shortDomain?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.tenantService.updateDomains(id, domains);
  }

  // ==================== Members ====================

  @Get(':id/members')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('team:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取租户成员列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getMembers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tenantService.getMembers(id, page, limit);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('team:invite')
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加租户成员' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string' },
        role: { type: 'string', enum: ['owner', 'admin', 'member'] },
        permissions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  addMember(
    @Param('id') id: string,
    @Body() data: {
      userId: string;
      role?: string;
      permissions?: string[];
    },
    @CurrentUser() user: any,
  ) {
    return this.tenantService.addMember(id, data.userId, data.role, data.permissions, user.sub);
  }

  @Put(':id/members/:memberId')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('team:roles_manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新成员角色和权限' })
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() data: {
      role?: string;
      permissions?: string[];
    },
  ) {
    return this.tenantService.updateMember(memberId, data.role, data.permissions);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('team:remove')
  @ApiBearerAuth()
  @ApiOperation({ summary: '移除租户成员' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    await this.tenantService.removeMember(memberId);
  }

  // ==================== Invitations ====================

  @Post(':id/invitations')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('team:invite')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建邀请' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string' },
        role: { type: 'string', enum: ['admin', 'member'] },
        permissions: { type: 'array', items: { type: 'string' } },
        expiresInDays: { type: 'number', default: 7 },
      },
    },
  })
  createInvitation(
    @Param('id') id: string,
    @Body() data: {
      email: string;
      role?: string;
      permissions?: string[];
      expiresInDays?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.tenantService.createInvitation(
      id,
      data.email,
      user.sub,
      data.role,
      data.permissions,
      data.expiresInDays,
    );
  }

  @Get(':id/invitations')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('team:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取邀请列表' })
  getInvitations(@Param('id') id: string) {
    return this.tenantService.getInvitations(id);
  }

  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '接受邀请' })
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.acceptInvitation(token, user.sub);
  }

  @Delete(':id/invitations/:invitationId')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('team:invite')
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消邀请' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.tenantService.cancelInvitation(invitationId);
  }

  // ==================== API Keys ====================

  @Post(':id/api-keys')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('api_keys:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 API Key' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
        scopes: { type: 'array', items: { type: 'string' } },
        rateLimit: { type: 'number', default: 1000 },
        ipWhitelist: { type: 'array', items: { type: 'string' } },
        expiresInDays: { type: 'number' },
      },
    },
  })
  createApiKey(
    @Param('id') id: string,
    @Body() data: {
      name: string;
      permissions?: string[];
      scopes?: string[];
      rateLimit?: number;
      ipWhitelist?: string[];
      expiresInDays?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.tenantService.createApiKey(id, data, user.sub);
  }

  @Get(':id/api-keys')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('api_keys:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 API Key 列表' })
  getApiKeys(@Param('id') id: string) {
    return this.tenantService.getApiKeys(id);
  }

  @Delete(':id/api-keys/:keyId')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('api_keys:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: '撤销 API Key' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(
    @Param('id') id: string,
    @Param('keyId') keyId: string,
  ) {
    await this.tenantService.revokeApiKey(keyId);
  }

  @Post('api-keys/validate')
  @ApiOperation({ summary: '验证 API Key' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['apiKey'],
      properties: {
        apiKey: { type: 'string' },
      },
    },
  })
  validateApiKey(@Body('apiKey') apiKey: string) {
    return this.tenantService.validateApiKey(apiKey);
  }

  // ==================== Audit Logs ====================

  @Get(':id/audit-logs')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取审计日志' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAuditLogs(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.tenantService.getAuditLogs(id, {
      page,
      limit,
      action,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // ==================== Sub-tenants (Reseller) ====================

  @Get(':id/sub-tenants')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取子租户列表（经销商模式）' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getSubTenants(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tenantService.getSubTenants(id, page, limit);
  }

  @Post(':id/sub-tenants')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建子租户' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'slug', 'ownerEmail'],
      properties: {
        name: { type: 'string' },
        slug: { type: 'string' },
        ownerEmail: { type: 'string' },
        type: { type: 'string', enum: [TenantType.PERSONAL, TenantType.TEAM] },
      },
    },
  })
  createSubTenant(
    @Param('id') id: string,
    @Body() data: {
      name: string;
      slug: string;
      ownerEmail: string;
      type?: TenantType;
    },
    @CurrentUser() user: any,
  ) {
    return this.tenantService.createSubTenant(id, data, user.sub);
  }

  // ==================== Billing ====================

  @Get(':id/billing')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('billing:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取计费信息' })
  getBilling(@Param('id') id: string) {
    return this.tenantService.getBilling(id);
  }

  @Put(':id/billing')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('billing:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新计费信息' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        billingEmail: { type: 'string' },
        taxId: { type: 'string' },
        paymentMethod: { type: 'string' },
      },
    },
  })
  updateBilling(
    @Param('id') id: string,
    @Body() billing: any,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.updateBilling(id, billing);
  }

  // ==================== Public Endpoints ====================

  @Get('by-slug/:slug')
  @ApiOperation({ summary: '通过 slug 获取租户公开信息' })
  getTenantBySlug(@Param('slug') slug: string) {
    return this.tenantService.getTenantBySlug(slug);
  }

  @Get('by-domain/:domain')
  @ApiOperation({ summary: '通过域名获取租户' })
  getTenantByDomain(@Param('domain') domain: string) {
    return this.tenantService.getTenantByDomain(domain);
  }

  // ==================== Health & Stats ====================

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @RequireScope('settings:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取租户统计信息' })
  getStats(@Param('id') id: string) {
    return this.tenantService.getStats(id);
  }
}
