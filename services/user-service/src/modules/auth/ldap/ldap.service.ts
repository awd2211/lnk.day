import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ldap from 'ldapjs';

import { LdapConfig, LdapSecurityProtocol } from './ldap-config.entity';

export interface LdapUser {
  dn: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups: string[];
  rawAttributes: Record<string, any>;
}

export interface LdapTestResult {
  success: boolean;
  message: string;
  details?: {
    connected: boolean;
    boundSuccessfully: boolean;
    userSearchSuccessful: boolean;
    sampleUsers?: number;
    error?: string;
  };
}

export interface LdapSyncResult {
  success: boolean;
  usersFound: number;
  usersCreated: number;
  usersUpdated: number;
  errors: string[];
}

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(
    @InjectRepository(LdapConfig)
    private readonly ldapConfigRepo: Repository<LdapConfig>,
  ) {}

  // ========== Configuration CRUD ==========

  async createConfig(teamId: string, config: Partial<LdapConfig>): Promise<LdapConfig> {
    // Check if config already exists for team
    const existing = await this.ldapConfigRepo.findOne({ where: { teamId } });
    if (existing) {
      throw new BadRequestException('LDAP configuration already exists for this team');
    }

    const ldapConfig = this.ldapConfigRepo.create({
      ...config,
      teamId,
      enabled: false, // Start disabled until tested
    });

    return this.ldapConfigRepo.save(ldapConfig);
  }

  async getConfig(teamId: string): Promise<LdapConfig | null> {
    return this.ldapConfigRepo.findOne({ where: { teamId } });
  }

  async updateConfig(teamId: string, updates: Partial<LdapConfig>): Promise<LdapConfig> {
    const config = await this.getConfig(teamId);
    if (!config) {
      throw new NotFoundException('LDAP configuration not found');
    }

    // Don't allow enabling without successful test
    if (updates.enabled && !config.lastTestResult?.includes('success')) {
      throw new BadRequestException('Cannot enable LDAP without successful test');
    }

    Object.assign(config, updates);
    return this.ldapConfigRepo.save(config);
  }

  async deleteConfig(teamId: string): Promise<boolean> {
    const result = await this.ldapConfigRepo.delete({ teamId });
    return result.affected > 0;
  }

  // ========== LDAP Operations ==========

  async testConnection(teamId: string): Promise<LdapTestResult> {
    const config = await this.getConfig(teamId);
    if (!config) {
      return {
        success: false,
        message: 'LDAP configuration not found',
      };
    }

    const details: LdapTestResult['details'] = {
      connected: false,
      boundSuccessfully: false,
      userSearchSuccessful: false,
    };

    try {
      const client = await this.createClient(config);
      details.connected = true;

      // Test bind
      await this.bindClient(client, config.bindDn, config.bindPassword);
      details.boundSuccessfully = true;

      // Test user search
      const users = await this.searchUsers(client, config, 5);
      details.userSearchSuccessful = true;
      details.sampleUsers = users.length;

      // Cleanup
      client.unbind();

      // Update config with test result
      config.lastTestAt = new Date();
      config.lastTestResult = 'success';
      await this.ldapConfigRepo.save(config);

      return {
        success: true,
        message: `Connection successful. Found ${users.length} sample users.`,
        details,
      };
    } catch (error) {
      details.error = error.message;

      // Update config with test result
      config.lastTestAt = new Date();
      config.lastTestResult = `failed: ${error.message}`;
      await this.ldapConfigRepo.save(config);

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        details,
      };
    }
  }

  async authenticate(
    teamId: string,
    username: string,
    password: string,
  ): Promise<LdapUser | null> {
    const config = await this.getConfig(teamId);
    if (!config || !config.enabled) {
      return null;
    }

    try {
      const client = await this.createClient(config);

      // First, bind with service account to find user
      await this.bindClient(client, config.bindDn, config.bindPassword);

      // Search for user
      const filter = config.userSearchFilter.replace('{{username}}', this.escapeLdapFilter(username));
      const searchResult = await this.searchWithFilter(client, config.baseDn, filter, config);

      if (searchResult.length === 0) {
        client.unbind();
        return null;
      }

      const userEntry = searchResult[0];
      const userDn = userEntry.dn;

      // Verify user password by binding as user
      const userClient = await this.createClient(config);
      try {
        await this.bindClient(userClient, userDn, password);
        userClient.unbind();
      } catch (error) {
        client.unbind();
        return null; // Invalid password
      }

      // Get user's groups
      const groups = await this.getUserGroups(client, config, userDn);

      // Map attributes
      const ldapUser = this.mapUserAttributes(userEntry, config, groups);

      client.unbind();
      return ldapUser;
    } catch (error) {
      this.logger.error(`LDAP authentication error: ${error.message}`);
      return null;
    }
  }

  async syncUsers(teamId: string): Promise<LdapSyncResult> {
    const config = await this.getConfig(teamId);
    if (!config || !config.enabled) {
      return {
        success: false,
        usersFound: 0,
        usersCreated: 0,
        usersUpdated: 0,
        errors: ['LDAP not configured or enabled'],
      };
    }

    const result: LdapSyncResult = {
      success: true,
      usersFound: 0,
      usersCreated: 0,
      usersUpdated: 0,
      errors: [],
    };

    try {
      const client = await this.createClient(config);
      await this.bindClient(client, config.bindDn, config.bindPassword);

      const users = await this.searchUsers(client, config);
      result.usersFound = users.length;

      // In production, iterate users and sync with user database
      // For now, just count
      for (const user of users) {
        try {
          // Check if user exists, create or update
          // This would integrate with UserService
          result.usersUpdated++;
        } catch (error) {
          result.errors.push(`Failed to sync user ${user.username}: ${error.message}`);
        }
      }

      client.unbind();

      // Update config
      config.lastSyncAt = new Date();
      config.syncedUsersCount = result.usersFound;
      await this.ldapConfigRepo.save(config);
    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  // ========== Internal Methods ==========

  private async createClient(config: LdapConfig): Promise<ldap.Client> {
    const url = this.buildLdapUrl(config);

    const clientOptions: ldap.ClientOptions = {
      url,
      connectTimeout: config.connectionTimeout,
      timeout: config.connectionTimeout,
    };

    if (config.securityProtocol === 'ssl') {
      clientOptions.tlsOptions = {
        rejectUnauthorized: false, // Set to true in production with proper certs
      };
    }

    return new Promise((resolve, reject) => {
      const client = ldap.createClient(clientOptions);

      client.on('connect', () => {
        if (config.securityProtocol === 'starttls') {
          client.starttls({}, [], (err) => {
            if (err) {
              reject(new Error(`STARTTLS failed: ${err.message}`));
            } else {
              resolve(client);
            }
          });
        } else {
          resolve(client);
        }
      });

      client.on('error', (err) => {
        reject(new Error(`Connection error: ${err.message}`));
      });

      client.on('connectError', (err) => {
        reject(new Error(`Connect error: ${err.message}`));
      });
    });
  }

  private buildLdapUrl(config: LdapConfig): string {
    const protocol = config.securityProtocol === 'ssl' ? 'ldaps' : 'ldap';
    return `${protocol}://${config.host}:${config.port}`;
  }

  private bindClient(client: ldap.Client, dn: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      client.bind(dn, password, (err) => {
        if (err) {
          reject(new Error(`Bind failed: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  private async searchUsers(
    client: ldap.Client,
    config: LdapConfig,
    limit?: number,
  ): Promise<LdapUser[]> {
    // Use a generic filter to find all users
    const filter = config.userSearchFilter.replace('{{username}}', '*');
    const entries = await this.searchWithFilter(client, config.baseDn, filter, config, limit);

    return entries.map((entry) => this.mapUserAttributes(entry, config, []));
  }

  private searchWithFilter(
    client: ldap.Client,
    baseDn: string,
    filter: string,
    config: LdapConfig,
    limit?: number,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const opts: ldap.SearchOptions = {
        filter,
        scope: config.searchScope,
        attributes: Object.values(config.attributeMapping),
        sizeLimit: limit || 0,
      };

      const entries: any[] = [];

      client.search(baseDn, opts, (err, res) => {
        if (err) {
          reject(new Error(`Search failed: ${err.message}`));
          return;
        }

        res.on('searchEntry', (entry) => {
          entries.push({
            dn: entry.dn.toString(),
            attributes: this.entryToObject(entry),
          });
        });

        res.on('error', (err) => {
          reject(new Error(`Search error: ${err.message}`));
        });

        res.on('end', () => {
          resolve(entries);
        });
      });
    });
  }

  private async getUserGroups(
    client: ldap.Client,
    config: LdapConfig,
    userDn: string,
  ): Promise<string[]> {
    if (!config.groupBaseDn) {
      return [];
    }

    try {
      const filter = config.groupSearchFilter.replace('{{userDn}}', this.escapeLdapFilter(userDn));
      const entries = await this.searchWithFilter(client, config.groupBaseDn, filter, config);
      return entries.map((e) => e.dn);
    } catch (error) {
      this.logger.warn(`Failed to get user groups: ${error.message}`);
      return [];
    }
  }

  private mapUserAttributes(
    entry: any,
    config: LdapConfig,
    groups: string[],
  ): LdapUser {
    const attrs = entry.attributes || {};
    const mapping = config.attributeMapping;

    return {
      dn: entry.dn,
      username: attrs[mapping.username] || '',
      email: attrs[mapping.email] || '',
      firstName: mapping.firstName ? attrs[mapping.firstName] : undefined,
      lastName: mapping.lastName ? attrs[mapping.lastName] : undefined,
      displayName: mapping.displayName ? attrs[mapping.displayName] : undefined,
      groups,
      rawAttributes: attrs,
    };
  }

  private entryToObject(entry: ldap.SearchEntry): Record<string, any> {
    const obj: Record<string, any> = {};

    for (const attr of entry.attributes) {
      const values = attr.values;
      obj[attr.type] = values.length === 1 ? values[0] : values;
    }

    return obj;
  }

  private escapeLdapFilter(str: string): string {
    return str
      .replace(/\\/g, '\\5c')
      .replace(/\*/g, '\\2a')
      .replace(/\(/g, '\\28')
      .replace(/\)/g, '\\29')
      .replace(/\x00/g, '\\00');
  }

  // ========== Role Mapping ==========

  getMappedRole(config: LdapConfig, groups: string[]): string | null {
    for (const group of groups) {
      const mappedRole = config.groupMapping[group];
      if (mappedRole) {
        return mappedRole;
      }
    }
    return config.defaultRole || null;
  }
}
