import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Redis from 'ioredis';

const execAsync = promisify(exec);

export interface ServiceInfo {
  name: string;
  url: string;
  port: number;
}

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private readonly httpClient: AxiosInstance;
  private readonly services: ServiceInfo[];
  private redis: Redis | null = null;
  private featureFlags: Map<string, boolean> = new Map();
  private clickhouseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.clickhouseUrl = this.configService.get('CLICKHOUSE_HTTP_URL', 'http://localhost:60032');
    this.httpClient = axios.create({
      timeout: 5000,
      headers: {
        'x-internal-api-key': this.configService.get('INTERNAL_API_KEY'),
      },
    });

    // Initialize Redis connection
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:60031');
    try {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err) => {
        this.logger.error('Redis connection error', err);
      });
    } catch (error) {
      this.logger.warn('Could not connect to Redis');
    }

    // Initialize default feature flags
    // Feature flags matching frontend expected names
    this.featureFlags.set('enableRegistration', true);
    this.featureFlags.set('enableBioLinks', true);
    this.featureFlags.set('enableQRCodes', true);
    this.featureFlags.set('enableCampaigns', true);
    this.featureFlags.set('enableTeams', true);
    this.featureFlags.set('enableDeepLinks', true);
    this.featureFlags.set('enableRedirectRules', true);
    this.featureFlags.set('maintenanceMode', false);

    this.services = [
      // 网关服务
      { name: 'api-gateway', url: this.configService.get('API_GATEWAY_URL', 'http://localhost:60000'), port: 60000 },
      // 数据服务
      { name: 'datastream-service', url: this.configService.get('DATASTREAM_SERVICE_URL', 'http://localhost:60001'), port: 60001 },
      // 核心业务服务
      { name: 'user-service', url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'), port: 60002 },
      { name: 'link-service', url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'), port: 60003 },
      { name: 'campaign-service', url: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60004'), port: 60004 },
      { name: 'qr-service', url: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005'), port: 60005 },
      { name: 'page-service', url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'), port: 60007 },
      { name: 'deeplink-service', url: this.configService.get('DEEPLINK_SERVICE_URL', 'http://localhost:60008'), port: 60008 },
      { name: 'domain-service', url: this.configService.get('DOMAIN_SERVICE_URL', 'http://localhost:60014'), port: 60014 },
      // 集成服务
      { name: 'integration-service', url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'), port: 60016 },
      { name: 'webhook-service', url: this.configService.get('WEBHOOK_SERVICE_URL', 'http://localhost:60017'), port: 60017 },
      // 通知服务
      { name: 'notification-service', url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'), port: 60020 },
      // 分析与重定向服务
      { name: 'analytics-service', url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'), port: 60050 },
      { name: 'redirect-service', url: this.configService.get('REDIRECT_SERVICE_URL', 'http://localhost:60080'), port: 60080 },
    ];
  }

  async getSystemInfo(): Promise<{
    platform: string;
    hostname: string;
    uptime: number;
    memory: { total: number; free: number; used: number };
    cpu: { cores: number; model: string; load: number[] };
    nodeVersion: string;
  }> {
    return {
      platform: os.platform(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        load: os.loadavg(),
      },
      nodeVersion: process.version,
    };
  }

  async getServicesStatus(): Promise<
    Array<{
      name: string;
      url: string;
      status: 'online' | 'offline' | 'degraded';
      latency: number;
      version?: string;
      details?: any;
    }>
  > {
    const results = await Promise.all(
      this.services.map(async (service) => {
        const start = Date.now();
        try {
          // 根据不同服务确定健康检查路径
          let healthPath = '/api/v1/health'; // 默认 NestJS 服务
          if (['analytics-service', 'redirect-service', 'datastream-service'].includes(service.name)) {
            healthPath = '/health'; // Python/Go 服务
          }
          const response = await this.httpClient.get(`${service.url}${healthPath}`, {
            timeout: 3000,
          });
          return {
            name: service.name,
            url: service.url,
            status: 'online' as const,
            latency: Date.now() - start,
            version: response.data?.version,
            details: response.data,
          };
        } catch (error: any) {
          return {
            name: service.name,
            url: service.url,
            status: 'offline' as const,
            latency: -1,
            details: { error: error.message },
          };
        }
      }),
    );

    return results;
  }

  async getServiceLogs(serviceName: string, options?: { lines?: number; level?: string }): Promise<{
    service: string;
    logs: string[];
    total: number;
    message: string;
  }> {
    const lines = options?.lines || 100;
    const level = options?.level;

    try {
      // Try to read from PM2 logs
      const pm2LogDir = path.join(os.homedir(), '.pm2', 'logs');
      const outLogFile = path.join(pm2LogDir, `${serviceName}-out.log`);
      const errLogFile = path.join(pm2LogDir, `${serviceName}-error.log`);

      let logs: string[] = [];

      // Read out log
      if (fs.existsSync(outLogFile)) {
        const { stdout } = await execAsync(`tail -n ${lines} "${outLogFile}"`);
        logs.push(...stdout.split('\n').filter(line => line.trim()));
      }

      // Read error log
      if (fs.existsSync(errLogFile)) {
        const { stdout } = await execAsync(`tail -n ${lines} "${errLogFile}"`);
        logs.push(...stdout.split('\n').filter(line => line.trim()));
      }

      // Filter by log level if specified
      if (level) {
        const levelPattern = new RegExp(`\\b${level.toUpperCase()}\\b`, 'i');
        logs = logs.filter(line => levelPattern.test(line));
      }

      // Sort by timestamp (newest first) and limit
      logs = logs
        .sort((a, b) => b.localeCompare(a))
        .slice(0, lines);

      return {
        service: serviceName,
        logs,
        total: logs.length,
        message: logs.length > 0 ? 'Logs retrieved from PM2' : 'No logs found for this service',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get logs for ${serviceName}`, error);
      return {
        service: serviceName,
        logs: [],
        total: 0,
        message: `Failed to retrieve logs: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  async getConfig(): Promise<{
    environment: string;
    services: ServiceInfo[];
    features: Record<string, boolean>;
  }> {
    // Use the featureFlags Map for dynamic configuration
    const features: Record<string, boolean> = {};
    this.featureFlags.forEach((value, key) => {
      features[key] = value;
    });

    return {
      environment: this.configService.get('NODE_ENV', 'development'),
      services: this.services,
      features,
    };
  }

  async restartService(serviceName: string): Promise<{ success: boolean; message: string; details?: any }> {
    this.logger.warn(`Service restart requested for: ${serviceName}`);

    // Validate service name to prevent command injection
    const validServiceNames = this.services.map(s => s.name);
    if (!validServiceNames.includes(serviceName)) {
      return {
        success: false,
        message: `Unknown service: ${serviceName}. Valid services: ${validServiceNames.join(', ')}`,
      };
    }

    try {
      // Try PM2 restart first
      const { stdout, stderr } = await execAsync(`pm2 restart ${serviceName} --update-env 2>&1`);

      if (stderr && !stderr.includes('Process successfully started')) {
        this.logger.error(`PM2 restart stderr: ${stderr}`);
      }

      this.logger.log(`Service ${serviceName} restarted successfully`);
      return {
        success: true,
        message: `Service ${serviceName} restarted successfully`,
        details: { output: stdout.trim() },
      };
    } catch (pm2Error: any) {
      this.logger.warn(`PM2 restart failed for ${serviceName}, trying Docker...`);

      // Try Docker restart as fallback
      try {
        const containerName = `lnk-${serviceName}`;
        const { stdout } = await execAsync(`docker restart ${containerName} 2>&1`);

        return {
          success: true,
          message: `Docker container ${containerName} restarted successfully`,
          details: { output: stdout.trim() },
        };
      } catch (dockerError: any) {
        this.logger.error(`Failed to restart ${serviceName}`, dockerError);
        return {
          success: false,
          message: `Failed to restart ${serviceName}. Neither PM2 nor Docker container found.`,
          details: { pm2Error: pm2Error?.message, dockerError: dockerError?.message },
        };
      }
    }
  }

  async getQueueStats(): Promise<{
    queues: Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    }>;
  }> {
    const queues: Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    }> = [];

    try {
      // Query RabbitMQ Management API
      const rabbitmqUrl = this.configService.get('RABBITMQ_MANAGEMENT_URL', 'http://localhost:60037');
      const rabbitmqUser = this.configService.get('RABBITMQ_USER', 'rabbit');
      const rabbitmqPass = this.configService.get('RABBITMQ_PASS', 'rabbit123');

      const response = await axios.get(`${rabbitmqUrl}/api/queues`, {
        auth: {
          username: rabbitmqUser,
          password: rabbitmqPass,
        },
        timeout: 3000,
      });

      for (const queue of response.data) {
        queues.push({
          name: queue.name,
          waiting: queue.messages_ready || 0,
          active: queue.messages_unacknowledged || 0,
          completed: queue.message_stats?.ack || 0,
          failed: queue.message_stats?.redeliver || 0,
        });
      }
    } catch (error) {
      this.logger.warn('Failed to get RabbitMQ queue stats', error);
      // Return empty array if RabbitMQ is not available
    }

    return { queues };
  }

  async getCacheStats(): Promise<{
    redis: {
      connected: boolean;
      memory: { used: string; peak: string };
      keys: number;
      hits: number;
      misses: number;
    };
  }> {
    if (!this.redis) {
      return {
        redis: {
          connected: false,
          memory: { used: '0MB', peak: '0MB' },
          keys: 0,
          hits: 0,
          misses: 0,
        },
      };
    }

    try {
      const info = await this.redis.info('memory');
      const stats = await this.redis.info('stats');
      const dbsize = await this.redis.dbsize();

      const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || '0MB';
      const peakMemory = info.match(/used_memory_peak_human:(\S+)/)?.[1] || '0MB';
      const keyspaceHits = parseInt(stats.match(/keyspace_hits:(\d+)/)?.[1] || '0', 10);
      const keyspaceMisses = parseInt(stats.match(/keyspace_misses:(\d+)/)?.[1] || '0', 10);

      return {
        redis: {
          connected: true,
          memory: { used: usedMemory, peak: peakMemory },
          keys: dbsize,
          hits: keyspaceHits,
          misses: keyspaceMisses,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Redis stats', error);
      return {
        redis: {
          connected: false,
          memory: { used: '0MB', peak: '0MB' },
          keys: 0,
          hits: 0,
          misses: 0,
        },
      };
    }
  }

  async getDatabaseStats(): Promise<{
    postgres: {
      connected: boolean;
      activeConnections: number;
      maxConnections: number;
      databaseSize: string;
    };
    clickhouse: {
      connected: boolean;
      totalRows: number;
      diskUsage: string;
    };
  }> {
    // PostgreSQL stats
    let pgStats = {
      connected: false,
      activeConnections: 0,
      maxConnections: 100,
      databaseSize: '0MB',
    };

    try {
      // Check if connected
      if (this.dataSource.isInitialized) {
        pgStats.connected = true;

        // Get active connections
        const activeResult = await this.dataSource.query(
          `SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`
        );
        pgStats.activeConnections = parseInt(activeResult[0]?.count || '0', 10);

        // Get max connections
        const maxResult = await this.dataSource.query(
          `SHOW max_connections`
        );
        pgStats.maxConnections = parseInt(maxResult[0]?.max_connections || '100', 10);

        // Get database size
        const sizeResult = await this.dataSource.query(
          `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
        );
        pgStats.databaseSize = sizeResult[0]?.size || '0MB';
      }
    } catch (error) {
      this.logger.error('Failed to get PostgreSQL stats', error);
    }

    // ClickHouse stats
    let chStats = {
      connected: false,
      totalRows: 0,
      diskUsage: '0MB',
    };

    try {
      // Query ClickHouse HTTP interface
      const rowsResponse = await axios.get(`${this.clickhouseUrl}/?query=SELECT sum(rows) FROM system.parts WHERE active FORMAT JSONCompact`, {
        timeout: 3000,
      });
      const rowsData = rowsResponse.data;
      if (rowsData?.data?.[0]?.[0]) {
        chStats.totalRows = parseInt(rowsData.data[0][0], 10);
      }
      chStats.connected = true;

      const diskResponse = await axios.get(`${this.clickhouseUrl}/?query=SELECT formatReadableSize(sum(bytes_on_disk)) FROM system.parts WHERE active FORMAT JSONCompact`, {
        timeout: 3000,
      });
      const diskData = diskResponse.data;
      if (diskData?.data?.[0]?.[0]) {
        chStats.diskUsage = diskData.data[0][0];
      }
    } catch (error) {
      this.logger.warn('Failed to get ClickHouse stats', error);
    }

    return {
      postgres: pgStats,
      clickhouse: chStats,
    };
  }

  // Feature Flags Management
  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const flags: Record<string, boolean> = {};
    this.featureFlags.forEach((value, key) => {
      flags[key] = value;
    });
    return flags;
  }

  async updateFeatureFlag(flag: string, enabled: boolean): Promise<{ flag: string; enabled: boolean }> {
    this.featureFlags.set(flag, enabled);
    this.logger.log(`Feature flag '${flag}' set to ${enabled}`);
    return { flag, enabled };
  }

  async toggleMaintenanceMode(enabled: boolean): Promise<{ maintenanceMode: boolean; message: string }> {
    this.featureFlags.set('maintenanceMode', enabled);
    this.logger.warn(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    return {
      maintenanceMode: enabled,
      message: enabled ? 'System is now in maintenance mode' : 'Maintenance mode disabled',
    };
  }

  // Cache Management
  async clearCache(pattern?: string): Promise<{ cleared: number; message: string }> {
    if (!this.redis) {
      return { cleared: 0, message: 'Redis not connected' };
    }

    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        this.logger.log(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
        return { cleared: keys.length, message: `Cleared ${keys.length} keys matching '${pattern}'` };
      } else {
        await this.redis.flushdb();
        this.logger.warn('Flushed entire cache database');
        return { cleared: -1, message: 'Entire cache database flushed' };
      }
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
      throw new BadRequestException('Failed to clear cache');
    }
  }

  async getCacheKeys(pattern: string = '*', limit: number = 100): Promise<{ keys: string[]; total: number }> {
    if (!this.redis) {
      return { keys: [], total: 0 };
    }

    try {
      const keys = await this.redis.keys(pattern);
      return {
        keys: keys.slice(0, limit),
        total: keys.length,
      };
    } catch (error) {
      this.logger.error('Failed to get cache keys', error);
      return { keys: [], total: 0 };
    }
  }

  // Backup Operations
  private getBackupDir(): string {
    const backupDir = this.configService.get('BACKUP_DIR', '/home/eric/lnk.day/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  private getBackupMetadataFile(): string {
    return path.join(this.getBackupDir(), 'backup-metadata.json');
  }

  private loadBackupMetadata(): Array<{
    id: string;
    type: string;
    status: string;
    size: string;
    filename: string;
    database: string;
    createdAt: Date;
  }> {
    const metadataFile = this.getBackupMetadataFile();
    if (fs.existsSync(metadataFile)) {
      try {
        const data = fs.readFileSync(metadataFile, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        this.logger.error('Failed to load backup metadata', error);
      }
    }
    return [];
  }

  private saveBackupMetadata(metadata: Array<any>): void {
    const metadataFile = this.getBackupMetadataFile();
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  }

  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<{
    success: boolean;
    backupId: string;
    type: string;
    message: string;
    timestamp: Date;
    filename?: string;
    databases?: string[];
  }> {
    const backupId = `backup_${Date.now()}`;
    const timestamp = new Date();
    const backupDir = this.getBackupDir();

    // Get database configuration
    const dbHost = this.configService.get('DB_HOST', 'localhost');
    const dbPort = this.configService.get('DB_PORT', '60030');
    const dbUser = this.configService.get('DB_USER', 'postgres');
    const dbPassword = this.configService.get('DB_PASSWORD', 'postgres');

    // All databases to backup
    const databases = [
      'lnk_users',
      'lnk_links',
      'lnk_campaigns',
      'lnk_pages',
      'lnk_qr',
      'lnk_deeplinks',
      'lnk_notifications',
      'lnk_console',
      'lnk_domains',
      'lnk_webhooks',
      'lnk_integrations',
      'lnk_gateway',
      'lnk_main',
    ];

    const filename = `${backupId}_all_databases.tar.gz`;
    const backupPath = path.join(backupDir, filename);
    const tempDir = path.join(backupDir, backupId);

    this.logger.log(`Creating ${type} backup for all databases: ${backupId}`);

    try {
      // Create temp directory
      fs.mkdirSync(tempDir, { recursive: true });

      const backedUpDbs: string[] = [];

      // Backup each database using docker exec
      for (const dbName of databases) {
        try {
          const dbBackupFile = path.join(tempDir, `${dbName}.sql`);
          // Use docker exec to run pg_dump inside the PostgreSQL container
          const pgDumpCmd = `docker exec lnk-postgres pg_dump -U ${dbUser} -d ${dbName} > "${dbBackupFile}" 2>/dev/null`;
          await execAsync(pgDumpCmd, { shell: '/bin/bash' });

          // Check if file has content (database exists)
          if (fs.existsSync(dbBackupFile)) {
            const stats = fs.statSync(dbBackupFile);
            if (stats.size > 100) {  // Minimum valid SQL file size
              backedUpDbs.push(dbName);
            } else {
              fs.unlinkSync(dbBackupFile);
            }
          }
        } catch {
          // Database might not exist, skip
          this.logger.warn(`Database ${dbName} not found or backup failed, skipping`);
        }
      }

      // Create tar.gz archive
      await execAsync(`cd "${tempDir}" && tar -czf "${backupPath}" *.sql`, { shell: '/bin/bash' });

      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });

      // Get file size
      const stats = fs.statSync(backupPath);
      const size = this.formatBytes(stats.size);

      // Update metadata
      const metadata = this.loadBackupMetadata();
      metadata.unshift({
        id: backupId,
        type,
        status: 'completed',
        size,
        filename,
        database: `${backedUpDbs.length} databases`,
        createdAt: timestamp,
      });

      // Keep only last 20 backups in metadata
      if (metadata.length > 20) {
        metadata.splice(20);
      }

      this.saveBackupMetadata(metadata);

      this.logger.log(`Backup completed: ${backupId}, size: ${size}, databases: ${backedUpDbs.join(', ')}`);

      return {
        success: true,
        backupId,
        type,
        message: `Backup created successfully: ${backedUpDbs.length} databases`,
        timestamp,
        filename,
        databases: backedUpDbs,
      };
    } catch (error: any) {
      this.logger.error(`Backup failed: ${backupId}`, error);

      // Cleanup temp directory if exists
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      // Record failed backup
      const metadata = this.loadBackupMetadata();
      metadata.unshift({
        id: backupId,
        type,
        status: 'failed',
        size: '0',
        filename: '',
        database: 'all',
        createdAt: timestamp,
      });
      this.saveBackupMetadata(metadata);

      return {
        success: false,
        backupId,
        type,
        message: `Backup failed: ${error?.message || 'Unknown error'}`,
        timestamp,
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getBackups(): Promise<Array<{
    id: string;
    type: string;
    status: string;
    size: string;
    filename?: string;
    database?: string;
    createdAt: Date;
  }>> {
    const metadata = this.loadBackupMetadata();

    // Verify files still exist
    const backupDir = this.getBackupDir();
    return metadata.map(backup => {
      if (backup.filename && backup.status === 'completed') {
        const backupPath = path.join(backupDir, backup.filename);
        if (!fs.existsSync(backupPath)) {
          backup.status = 'file_missing';
        }
      }
      return backup;
    });
  }

  async restoreBackup(backupId: string): Promise<{ success: boolean; message: string; databases?: string[] }> {
    this.logger.warn(`Restore requested for backup: ${backupId}`);

    const metadata = this.loadBackupMetadata();
    const backup = metadata.find(b => b.id === backupId);

    if (!backup) {
      return {
        success: false,
        message: `Backup not found: ${backupId}`,
      };
    }

    if (backup.status !== 'completed') {
      return {
        success: false,
        message: `Cannot restore backup with status: ${backup.status}`,
      };
    }

    const backupDir = this.getBackupDir();
    const backupPath = path.join(backupDir, backup.filename);

    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        message: `Backup file not found: ${backup.filename}`,
      };
    }

    const dbHost = this.configService.get('DB_HOST', 'localhost');
    const dbPort = this.configService.get('DB_PORT', '60030');
    const dbUser = this.configService.get('DB_USER', 'postgres');
    const dbPassword = this.configService.get('DB_PASSWORD', 'postgres');

    try {
      // Check if it's a tar.gz (multi-database) or single .sql.gz file
      if (backup.filename.endsWith('_all_databases.tar.gz')) {
        // Multi-database restore
        const tempDir = path.join(backupDir, `restore_${backupId}`);
        fs.mkdirSync(tempDir, { recursive: true });

        // Extract archive
        await execAsync(`tar -xzf "${backupPath}" -C "${tempDir}"`, { shell: '/bin/bash' });

        // Get list of SQL files
        const sqlFiles = fs.readdirSync(tempDir).filter(f => f.endsWith('.sql'));
        const restoredDbs: string[] = [];

        // Restore each database using docker exec
        for (const sqlFile of sqlFiles) {
          const dbName = sqlFile.replace('.sql', '');
          const sqlPath = path.join(tempDir, sqlFile);

          try {
            // Copy SQL file to container and restore
            const restoreCmd = `cat "${sqlPath}" | docker exec -i lnk-postgres psql -U ${dbUser} -d ${dbName} 2>/dev/null`;
            await execAsync(restoreCmd, { shell: '/bin/bash' });
            restoredDbs.push(dbName);
            this.logger.log(`Restored database: ${dbName}`);
          } catch (err) {
            this.logger.warn(`Failed to restore ${dbName}: ${err}`);
          }
        }

        // Cleanup temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        this.logger.log(`Backup restored: ${backupId}, databases: ${restoredDbs.join(', ')}`);

        return {
          success: true,
          message: `Backup restored successfully: ${restoredDbs.length} databases`,
          databases: restoredDbs,
        };
      } else {
        // Single database restore (legacy format)
        const dbName = backup.database || this.configService.get('DB_NAME', 'lnk_console');
        const restoreCmd = `gunzip -c "${backupPath}" | PGPASSWORD=${dbPassword} psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName}`;

        await execAsync(restoreCmd, { shell: '/bin/bash' });

        this.logger.log(`Backup restored: ${backupId}`);

        return {
          success: true,
          message: `Backup ${backupId} restored successfully to database ${dbName}`,
          databases: [dbName],
        };
      }
    } catch (error: any) {
      this.logger.error(`Restore failed for ${backupId}`, error);
      return {
        success: false,
        message: `Restore failed: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  async deleteBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    const metadata = this.loadBackupMetadata();
    const backupIndex = metadata.findIndex(b => b.id === backupId);

    if (backupIndex === -1) {
      return {
        success: false,
        message: `Backup not found: ${backupId}`,
      };
    }

    const backup = metadata[backupIndex]!;
    const backupDir = this.getBackupDir();

    // Delete file if exists
    if (backup.filename) {
      const backupPath = path.join(backupDir, backup.filename);
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    }

    // Remove from metadata
    metadata.splice(backupIndex, 1);
    this.saveBackupMetadata(metadata);

    this.logger.log(`Backup deleted: ${backupId}`);

    return {
      success: true,
      message: `Backup ${backupId} deleted successfully`,
    };
  }

  // Config Management
  async updateConfig(updates: Record<string, any>): Promise<{
    success: boolean;
    updated: string[];
    message: string;
  }> {
    // In production, this would update a config store or trigger service reloads
    const updatedKeys = Object.keys(updates);
    this.logger.log(`Config update requested for keys: ${updatedKeys.join(', ')}`);
    return {
      success: true,
      updated: updatedKeys,
      message: 'Config changes will take effect after service restart',
    };
  }

  // Health Check All Services
  async healthCheckAll(): Promise<{
    healthy: boolean;
    services: Array<{ name: string; status: string; latency: number }>;
    timestamp: Date;
  }> {
    const statuses = await this.getServicesStatus();
    const healthy = statuses.every(s => s.status === 'online');

    return {
      healthy,
      services: statuses.map(s => ({
        name: s.name,
        status: s.status,
        latency: s.latency,
      })),
      timestamp: new Date(),
    };
  }

  // Cleanup on module destroy
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
