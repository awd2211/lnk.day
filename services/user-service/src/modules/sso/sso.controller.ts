import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

import { SSOService } from './sso.service';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import {
  CreateSAMLConfigDto,
  CreateOIDCConfigDto,
  CreateLDAPConfigDto,
  UpdateSSOConfigDto,
  ImportIdPMetadataDto,
  UpdateSAMLConfigDto,
} from './dto/sso.dto';

@ApiTags('sso')
@Controller('sso')
export class SSOController {
  constructor(private readonly ssoService: SSOService) {}

  // ========== Config Management ==========

  @Get('configs')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取 SSO 配置列表' })
  getConfigs(@ScopedTeamId() teamId: string) {
    return this.ssoService.getConfigs(teamId);
  }

  @Get('configs/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取单个 SSO 配置' })
  getConfig(
    @ScopedTeamId() teamId: string,
    @Param('id') configId: string,
  ) {
    return this.ssoService.getConfig(teamId, configId);
  }

  // ========== SAML ==========

  @Post('saml/config')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '创建 SAML 配置' })
  createSAMLConfig(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateSAMLConfigDto,
  ) {
    return this.ssoService.createSAMLConfig(teamId, dto);
  }

  @Post('saml/config/import-metadata')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '从 IdP Metadata 创建 SAML 配置' })
  createSAMLConfigFromMetadata(
    @ScopedTeamId() teamId: string,
    @Body() dto: ImportIdPMetadataDto,
  ) {
    return this.ssoService.createSAMLConfigFromMetadata(teamId, dto);
  }

  @Put('saml/config/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '更新 SAML 配置' })
  updateSAMLConfig(
    @ScopedTeamId() teamId: string,
    @Param('id') configId: string,
    @Body() dto: UpdateSAMLConfigDto,
  ) {
    return this.ssoService.updateSAMLConfig(teamId, configId, dto);
  }

  @Get('saml/metadata')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取 SAML SP 元数据' })
  getSAMLMetadata(@ScopedTeamId() teamId: string) {
    return this.ssoService.getSAMLMetadata(teamId);
  }

  @Get('saml/metadata/download')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '下载 SAML SP 元数据 XML' })
  async downloadSAMLMetadata(@ScopedTeamId() teamId: string) {
    const metadata = await this.ssoService.getSAMLMetadata(teamId);
    return {
      contentType: 'application/xml',
      filename: `sp-metadata-${teamId}.xml`,
      content: metadata.metadataXml,
    };
  }

  @Get('saml/:teamId/login')
  @ApiOperation({ summary: '发起 SAML 登录' })
  initiateSAMLLogin(
    @Param('teamId') teamId: string,
    @Query('RelayState') relayState?: string,
  ) {
    return this.ssoService.initiateSAMLLogin(teamId, relayState);
  }

  @Post('saml/:teamId/logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发起 SAML 单点登出' })
  initiateSAMLLogout(
    @Param('teamId') teamId: string,
    @Body() body: { nameId: string; sessionIndex?: string },
  ) {
    return this.ssoService.initiateSAMLLogout(teamId, body.nameId, body.sessionIndex);
  }

  // ========== OIDC ==========

  @Post('oidc/config')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '创建 OIDC 配置' })
  createOIDCConfig(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateOIDCConfigDto,
  ) {
    return this.ssoService.createOIDCConfig(teamId, dto);
  }

  @Get('oidc/:teamId/login')
  @ApiOperation({ summary: '发起 OIDC 登录' })
  initiateOIDCLogin(@Param('teamId') teamId: string) {
    return this.ssoService.initiateOIDCLogin(teamId);
  }

  // ========== LDAP ==========

  @Post('ldap/config')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '创建 LDAP 配置' })
  createLDAPConfig(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateLDAPConfigDto,
  ) {
    return this.ssoService.createLDAPConfig(teamId, dto);
  }

  // ========== Common Operations ==========

  @Put('configs/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '更新 SSO 配置' })
  updateConfig(
    @ScopedTeamId() teamId: string,
    @Param('id') configId: string,
    @Body() dto: UpdateSSOConfigDto,
  ) {
    return this.ssoService.updateConfig(teamId, configId, dto);
  }

  @Post('configs/:id/activate')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '激活 SSO 配置' })
  activateConfig(
    @ScopedTeamId() teamId: string,
    @Param('id') configId: string,
  ) {
    return this.ssoService.activateConfig(teamId, configId);
  }

  @Post('configs/:id/deactivate')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '停用 SSO 配置' })
  deactivateConfig(
    @ScopedTeamId() teamId: string,
    @Param('id') configId: string,
  ) {
    return this.ssoService.deactivateConfig(teamId, configId);
  }

  @Delete('configs/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '删除 SSO 配置' })
  async deleteConfig(
    @ScopedTeamId() teamId: string,
    @Param('id') configId: string,
  ) {
    await this.ssoService.deleteConfig(teamId, configId);
    return { message: 'SSO configuration deleted' };
  }

  @Post('configs/:id/test')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '测试 SSO 连接' })
  testConnection(
    @ScopedTeamId() teamId: string,
    @Param('id') configId: string,
  ) {
    return this.ssoService.testConnection(teamId, configId);
  }

  // ========== SAML Callbacks ==========

  @Post('saml/:teamId/acs')
  @ApiOperation({ summary: 'SAML ACS (Assertion Consumer Service) 端点' })
  async samlACS(
    @Param('teamId') teamId: string,
    @Body() body: { SAMLResponse: string; RelayState?: string },
  ) {
    const result = await this.ssoService.processSAMLResponse(teamId, body.SAMLResponse);

    // Get or create user
    const config = await this.ssoService.getActiveConfig(teamId);
    if (config) {
      const userResult = await this.ssoService.getOrCreateUser(teamId, config.id, {
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        displayName: result.user.displayName,
        externalId: result.user.externalId || result.user.email,
      });

      // Create session
      await this.ssoService.createSession(
        config.id,
        userResult.userId,
        result.user.externalId || result.user.email,
        result.user as any,
      );

      return {
        success: true,
        user: result.user,
        userId: userResult.userId,
        isNewUser: userResult.isNew,
        redirectUrl: body.RelayState || '/dashboard',
      };
    }

    return { success: false, error: 'SSO configuration not found' };
  }

  @Post('saml/:teamId/slo')
  @ApiOperation({ summary: 'SAML SLO (Single Logout) 端点' })
  async samlSLO(
    @Param('teamId') teamId: string,
    @Body() body: { SAMLRequest?: string; SAMLResponse?: string },
  ) {
    // Handle logout request or response
    return { success: true, message: 'Logout processed' };
  }

  // ========== OIDC Callbacks ==========

  @Get('oidc/:teamId/callback')
  @ApiOperation({ summary: 'OIDC 回调端点' })
  async oidcCallback(
    @Param('teamId') teamId: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
  ) {
    if (error) {
      return {
        success: false,
        error,
        errorDescription,
      };
    }

    const result = await this.ssoService.handleOIDCCallback(teamId, code, state);

    // Get or create user
    const config = await this.ssoService.getActiveConfig(teamId);
    if (config) {
      const userResult = await this.ssoService.getOrCreateUser(teamId, config.id, {
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        displayName: result.user.displayName,
        externalId: result.user.externalId,
      });

      // Create session
      await this.ssoService.createSession(
        config.id,
        userResult.userId,
        result.user.externalId,
        { ...result.user, tokens: result.tokens },
      );

      return {
        success: true,
        user: result.user,
        userId: userResult.userId,
        isNewUser: userResult.isNew,
        accessToken: result.tokens.accessToken,
        redirectUrl: '/dashboard',
      };
    }

    return { success: false, error: 'SSO configuration not found' };
  }

  // ========== LDAP Authentication ==========

  @Post('ldap/:teamId/auth')
  @ApiOperation({ summary: 'LDAP 认证' })
  async ldapAuth(
    @Param('teamId') teamId: string,
    @Body() body: { username: string; password: string },
  ) {
    const result = await this.ssoService.authenticateLDAP(teamId, body.username, body.password);

    // Get or create user
    const config = await this.ssoService.getActiveConfig(teamId);
    if (config) {
      const userResult = await this.ssoService.getOrCreateUser(teamId, config.id, {
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        displayName: result.user.displayName,
        externalId: result.user.externalId,
        groups: result.user.groups,
      });

      // Create session
      await this.ssoService.createSession(
        config.id,
        userResult.userId,
        result.user.externalId,
        result.user as any,
      );

      return {
        success: true,
        user: result.user,
        userId: userResult.userId,
        isNewUser: userResult.isNew,
      };
    }

    return { success: false, error: 'SSO configuration not found' };
  }

  // ========== Domain Discovery ==========

  @Get('discover')
  @ApiOperation({ summary: '根据邮箱发现 SSO 配置' })
  async discoverSSO(@Query('email') email: string) {
    return this.ssoService.discoverSSO(email);
  }
}
