import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

import { LdapService } from './ldap.service';
import { LdapConfig, LdapSecurityProtocol } from './ldap-config.entity';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';

// DTOs
class CreateLdapConfigDto {
  name: string;
  host: string;
  port?: number;
  securityProtocol?: LdapSecurityProtocol;
  bindDn: string;
  bindPassword: string;
  baseDn: string;
  userSearchFilter?: string;
  attributeMapping?: {
    [key: string]: string | undefined;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    memberOf?: string;
  };
  groupBaseDn?: string;
  groupSearchFilter?: string;
  groupMapping?: Record<string, string>;
  autoProvisionUsers?: boolean;
  defaultRole?: string;
}

class UpdateLdapConfigDto {
  name?: string;
  host?: string;
  port?: number;
  securityProtocol?: LdapSecurityProtocol;
  bindDn?: string;
  bindPassword?: string;
  baseDn?: string;
  userSearchFilter?: string;
  attributeMapping?: {
    [key: string]: string | undefined;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    memberOf?: string;
  };
  groupBaseDn?: string;
  groupSearchFilter?: string;
  groupMapping?: Record<string, string>;
  autoProvisionUsers?: boolean;
  autoSyncGroups?: boolean;
  defaultRole?: string;
  enabled?: boolean;
}

class LdapAuthenticateDto {
  username: string;
  password: string;
}

@ApiTags('ldap')
@Controller('auth/ldap')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class LdapController {
  constructor(private readonly ldapService: LdapService) {}

  // ========== Configuration Endpoints ==========

  @Get('config')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: 'Get LDAP configuration' })
  async getConfig(@ScopedTeamId() teamId: string) {
    const config = await this.ldapService.getConfig(teamId);

    if (!config) {
      return { configured: false };
    }

    // Don't expose sensitive fields
    return {
      configured: true,
      id: config.id,
      name: config.name,
      host: config.host,
      port: config.port,
      securityProtocol: config.securityProtocol,
      bindDn: config.bindDn,
      baseDn: config.baseDn,
      userSearchFilter: config.userSearchFilter,
      attributeMapping: config.attributeMapping,
      groupBaseDn: config.groupBaseDn,
      groupSearchFilter: config.groupSearchFilter,
      groupMapping: config.groupMapping,
      autoProvisionUsers: config.autoProvisionUsers,
      autoSyncGroups: config.autoSyncGroups,
      defaultRole: config.defaultRole,
      enabled: config.enabled,
      lastTestAt: config.lastTestAt,
      lastTestResult: config.lastTestResult,
      lastSyncAt: config.lastSyncAt,
      syncedUsersCount: config.syncedUsersCount,
    };
  }

  @Post('config')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Create LDAP configuration' })
  async createConfig(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateLdapConfigDto,
  ) {
    const config = await this.ldapService.createConfig(teamId, dto);
    return {
      success: true,
      id: config.id,
      message: 'LDAP configuration created. Please test connection before enabling.',
    };
  }

  @Put('config')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Update LDAP configuration' })
  async updateConfig(
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateLdapConfigDto,
  ) {
    const config = await this.ldapService.updateConfig(teamId, dto);
    return {
      success: true,
      id: config.id,
      enabled: config.enabled,
    };
  }

  @Delete('config')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Delete LDAP configuration' })
  async deleteConfig(@ScopedTeamId() teamId: string) {
    const deleted = await this.ldapService.deleteConfig(teamId);
    return { success: deleted };
  }

  // ========== Testing & Sync ==========

  @Post('test')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Test LDAP connection' })
  async testConnection(@ScopedTeamId() teamId: string) {
    return this.ldapService.testConnection(teamId);
  }

  @Post('sync')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Sync users from LDAP' })
  async syncUsers(@ScopedTeamId() teamId: string) {
    return this.ldapService.syncUsers(teamId);
  }

  // ========== Authentication ==========

  @Post('authenticate')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Authenticate user via LDAP' })
  async authenticate(
    @ScopedTeamId() teamId: string,
    @Body() dto: LdapAuthenticateDto,
  ) {
    const user = await this.ldapService.authenticate(teamId, dto.username, dto.password);

    if (!user) {
      return {
        success: false,
        message: 'Authentication failed',
      };
    }

    return {
      success: true,
      user: {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        groups: user.groups,
      },
    };
  }

  // ========== Helper Endpoints ==========

  @Get('attribute-suggestions')
  @ApiOperation({ summary: 'Get common LDAP attribute suggestions' })
  getAttributeSuggestions() {
    return {
      suggestions: {
        username: ['uid', 'sAMAccountName', 'cn', 'userPrincipalName'],
        email: ['mail', 'email', 'userPrincipalName'],
        firstName: ['givenName', 'gn'],
        lastName: ['sn', 'surname'],
        displayName: ['displayName', 'cn', 'name'],
        memberOf: ['memberOf', 'isMemberOf'],
      },
      commonFilters: {
        activeDirectory: {
          userSearchFilter: '(&(objectClass=user)(sAMAccountName={{username}}))',
          groupSearchFilter: '(&(objectClass=group)(member={{userDn}}))',
        },
        openLdap: {
          userSearchFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
          groupSearchFilter: '(&(objectClass=groupOfNames)(member={{userDn}}))',
        },
        freeIpa: {
          userSearchFilter: '(&(objectClass=person)(uid={{username}}))',
          groupSearchFilter: '(&(objectClass=groupOfNames)(member={{userDn}}))',
        },
      },
      tips: [
        'Use {{username}} placeholder in userSearchFilter for the login username',
        'Use {{userDn}} placeholder in groupSearchFilter for the user DN',
        'Test connection before enabling LDAP authentication',
        'Set up group mapping to automatically assign roles',
      ],
    };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get LDAP configuration templates' })
  getTemplates() {
    return {
      templates: [
        {
          id: 'active_directory',
          name: 'Active Directory',
          description: 'Microsoft Active Directory',
          config: {
            port: 389,
            securityProtocol: 'starttls',
            userSearchFilter: '(&(objectClass=user)(sAMAccountName={{username}}))',
            attributeMapping: {
              username: 'sAMAccountName',
              email: 'mail',
              firstName: 'givenName',
              lastName: 'sn',
              displayName: 'displayName',
              memberOf: 'memberOf',
            },
            groupSearchFilter: '(&(objectClass=group)(member={{userDn}}))',
          },
        },
        {
          id: 'openldap',
          name: 'OpenLDAP',
          description: 'Standard OpenLDAP configuration',
          config: {
            port: 389,
            securityProtocol: 'starttls',
            userSearchFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
            attributeMapping: {
              username: 'uid',
              email: 'mail',
              firstName: 'givenName',
              lastName: 'sn',
              displayName: 'cn',
              memberOf: 'memberOf',
            },
            groupSearchFilter: '(&(objectClass=groupOfNames)(member={{userDn}}))',
          },
        },
        {
          id: 'freeipa',
          name: 'FreeIPA',
          description: 'Red Hat FreeIPA / Identity Management',
          config: {
            port: 389,
            securityProtocol: 'starttls',
            userSearchFilter: '(&(objectClass=person)(uid={{username}}))',
            attributeMapping: {
              username: 'uid',
              email: 'mail',
              firstName: 'givenName',
              lastName: 'sn',
              displayName: 'cn',
              memberOf: 'memberOf',
            },
            groupSearchFilter: '(&(objectClass=groupOfNames)(member={{userDn}}))',
          },
        },
        {
          id: 'azure_ad_ldaps',
          name: 'Azure AD (LDAPS)',
          description: 'Azure Active Directory via LDAPS',
          config: {
            port: 636,
            securityProtocol: 'ssl',
            userSearchFilter: '(&(objectClass=user)(userPrincipalName={{username}}))',
            attributeMapping: {
              username: 'userPrincipalName',
              email: 'mail',
              firstName: 'givenName',
              lastName: 'sn',
              displayName: 'displayName',
              memberOf: 'memberOf',
            },
          },
        },
      ],
    };
  }
}
