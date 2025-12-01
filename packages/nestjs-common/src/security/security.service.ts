import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// 安全事件类型
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  PERMISSION_CHANGE = 'permission_change',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
}

// 安全事件
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: Date;
}

// IP 信誉
export interface IpReputation {
  ip: string;
  score: number; // 0-100, higher is better
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  country?: string;
  city?: string;
  lastSeen?: Date;
  riskFactors: string[];
}

// 密码强度
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  estimatedCrackTime: string;
  isAcceptable: boolean;
}

// 加密选项
export interface EncryptionOptions {
  algorithm?: string;
  keyDerivation?: 'pbkdf2' | 'scrypt' | 'argon2';
  iterations?: number;
}

// CSRF Token 配置
export interface CsrfConfig {
  secret: string;
  tokenLength?: number;
  ttl?: number;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly securityEvents: SecurityEvent[] = [];
  private readonly loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private readonly blockedIps: Set<string> = new Set();
  private readonly csrfTokens: Map<string, { token: string; expiresAt: Date }> = new Map();

  private readonly encryptionKey: Buffer;
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number;

  constructor(private readonly configService: ConfigService) {
    // 从配置或环境变量获取加密密钥
    const keyHex = configService.get('ENCRYPTION_KEY', crypto.randomBytes(32).toString('hex'));
    this.encryptionKey = Buffer.from(keyHex, 'hex');
    this.maxLoginAttempts = configService.get('MAX_LOGIN_ATTEMPTS', 5);
    this.lockoutDuration = configService.get('LOCKOUT_DURATION', 900000); // 15 minutes
  }

  // ==================== 加密和解密 ====================

  /**
   * 对称加密
   */
  encrypt(plaintext: string, options?: EncryptionOptions): string {
    const algorithm = options?.algorithm || 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as any).getAuthTag();

    // 返回 iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 对称解密
   */
  decrypt(ciphertext: string, options?: EncryptionOptions): string {
    const algorithm = options?.algorithm || 'aes-256-gcm';
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, this.encryptionKey, iv);
    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const iterations = 100000;
    const keylen = 64;
    const digest = 'sha512';

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt.toString('hex')}:${iterations}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [saltHex, iterationsStr, keyHex] = hash.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const iterations = parseInt(iterationsStr, 10);
    const storedKey = Buffer.from(keyHex, 'hex');

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, storedKey.length, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(crypto.timingSafeEqual(storedKey, derivedKey));
      });
    });
  }

  /**
   * 生成安全随机 token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 哈希 token（用于存储）
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // ==================== 密码强度检查 ====================

  /**
   * 检查密码强度
   */
  checkPasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (password.length < 8) feedback.push('密码至少需要 8 个字符');

    // 复杂度检查
    if (/[a-z]/.test(password)) score += 0.5;
    else feedback.push('添加小写字母');

    if (/[A-Z]/.test(password)) score += 0.5;
    else feedback.push('添加大写字母');

    if (/[0-9]/.test(password)) score += 0.5;
    else feedback.push('添加数字');

    if (/[^a-zA-Z0-9]/.test(password)) score += 0.5;
    else feedback.push('添加特殊字符');

    // 常见密码检查
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
      score -= 2;
      feedback.push('避免使用常见密码');
    }

    // 重复字符检查
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('避免重复字符');
    }

    // 估算破解时间
    const charsetSize =
      ((/[a-z]/.test(password) ? 26 : 0) +
        (/[A-Z]/.test(password) ? 26 : 0) +
        (/[0-9]/.test(password) ? 10 : 0) +
        (/[^a-zA-Z0-9]/.test(password) ? 32 : 0)) || 26;

    const combinations = Math.pow(charsetSize, password.length);
    const guessesPerSecond = 1e10; // 10 billion
    const seconds = combinations / guessesPerSecond;

    let estimatedCrackTime: string;
    if (seconds < 1) estimatedCrackTime = '瞬间';
    else if (seconds < 60) estimatedCrackTime = `${Math.round(seconds)} 秒`;
    else if (seconds < 3600) estimatedCrackTime = `${Math.round(seconds / 60)} 分钟`;
    else if (seconds < 86400) estimatedCrackTime = `${Math.round(seconds / 3600)} 小时`;
    else if (seconds < 31536000) estimatedCrackTime = `${Math.round(seconds / 86400)} 天`;
    else estimatedCrackTime = `${Math.round(seconds / 31536000)} 年`;

    const finalScore = Math.max(0, Math.min(4, Math.floor(score)));

    return {
      score: finalScore,
      feedback,
      estimatedCrackTime,
      isAcceptable: finalScore >= 2 && password.length >= 8,
    };
  }

  // ==================== CSRF 保护 ====================

  /**
   * 生成 CSRF Token
   */
  generateCsrfToken(sessionId: string, config?: Partial<CsrfConfig>): string {
    const tokenLength = config?.tokenLength || 32;
    const ttl = config?.ttl || 3600000; // 1 hour

    const token = crypto.randomBytes(tokenLength).toString('hex');
    const expiresAt = new Date(Date.now() + ttl);

    this.csrfTokens.set(sessionId, { token, expiresAt });

    return token;
  }

  /**
   * 验证 CSRF Token
   */
  verifyCsrfToken(sessionId: string, token: string): boolean {
    const stored = this.csrfTokens.get(sessionId);

    if (!stored) return false;
    if (stored.expiresAt < new Date()) {
      this.csrfTokens.delete(sessionId);
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token),
    );
  }

  // ==================== XSS 和注入防护 ====================

  /**
   * 清理 HTML（防止 XSS）
   */
  sanitizeHtml(input: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;',
    };

    return input.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
  }

  /**
   * 检测 XSS 攻击模式
   */
  detectXss(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<\s*iframe/gi,
      /<\s*object/gi,
      /<\s*embed/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 检测 SQL 注入攻击模式
   */
  detectSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/gi,
      /(\b(UNION|JOIN)\s+(ALL\s+)?SELECT\b)/gi,
      /(--|\#|\/\*|\*\/)/g,
      /(\b(OR|AND)\s+[\d\w]+\s*=\s*[\d\w]+)/gi,
      /(['"])\s*(OR|AND)\s*\1\s*=\s*\1/gi,
      /;\s*(DROP|DELETE|TRUNCATE|UPDATE|INSERT)/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 清理用户输入
   */
  sanitizeInput(input: string): string {
    // 移除控制字符
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

    // 移除 null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // 标准化 Unicode
    sanitized = sanitized.normalize('NFC');

    return sanitized;
  }

  // ==================== 登录保护 ====================

  /**
   * 记录登录尝试
   */
  recordLoginAttempt(identifier: string, success: boolean, ip: string): void {
    const key = `${identifier}:${ip}`;

    if (success) {
      this.loginAttempts.delete(key);
      this.recordSecurityEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        severity: 'low',
        userId: identifier,
        ipAddress: ip,
        details: {},
      });
    } else {
      const attempts = this.loginAttempts.get(key) || { count: 0, lastAttempt: new Date() };
      attempts.count++;
      attempts.lastAttempt = new Date();
      this.loginAttempts.set(key, attempts);

      this.recordSecurityEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        severity: attempts.count >= this.maxLoginAttempts ? 'high' : 'medium',
        userId: identifier,
        ipAddress: ip,
        details: { attemptCount: attempts.count },
      });

      if (attempts.count >= this.maxLoginAttempts) {
        this.recordSecurityEvent({
          type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
          severity: 'critical',
          userId: identifier,
          ipAddress: ip,
          details: { attemptCount: attempts.count },
        });
      }
    }
  }

  /**
   * 检查是否被锁定
   */
  isLockedOut(identifier: string, ip: string): boolean {
    const key = `${identifier}:${ip}`;
    const attempts = this.loginAttempts.get(key);

    if (!attempts) return false;

    if (attempts.count >= this.maxLoginAttempts) {
      const lockoutEnd = new Date(attempts.lastAttempt.getTime() + this.lockoutDuration);
      if (new Date() < lockoutEnd) {
        return true;
      }
      // 锁定期已过，重置
      this.loginAttempts.delete(key);
    }

    return false;
  }

  /**
   * 获取剩余锁定时间（毫秒）
   */
  getLockoutRemaining(identifier: string, ip: string): number {
    const key = `${identifier}:${ip}`;
    const attempts = this.loginAttempts.get(key);

    if (!attempts || attempts.count < this.maxLoginAttempts) return 0;

    const lockoutEnd = new Date(attempts.lastAttempt.getTime() + this.lockoutDuration);
    const remaining = lockoutEnd.getTime() - Date.now();

    return Math.max(0, remaining);
  }

  // ==================== IP 管理 ====================

  /**
   * 封禁 IP
   */
  blockIp(ip: string, reason: string): void {
    this.blockedIps.add(ip);
    this.recordSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: 'high',
      ipAddress: ip,
      details: { action: 'ip_blocked', reason },
    });
    this.logger.warn(`IP blocked: ${ip} - ${reason}`);
  }

  /**
   * 解封 IP
   */
  unblockIp(ip: string): void {
    this.blockedIps.delete(ip);
    this.logger.log(`IP unblocked: ${ip}`);
  }

  /**
   * 检查 IP 是否被封禁
   */
  isIpBlocked(ip: string): boolean {
    return this.blockedIps.has(ip);
  }

  /**
   * 获取 IP 信誉评分
   */
  async getIpReputation(ip: string): Promise<IpReputation> {
    // 这里应该调用外部 IP 信誉服务
    // 简化实现：基于本地规则
    const riskFactors: string[] = [];
    let score = 100;

    // 检查是否在黑名单
    if (this.blockedIps.has(ip)) {
      score = 0;
      riskFactors.push('blocked');
    }

    // 检查登录失败记录
    const failedAttempts = Array.from(this.loginAttempts.entries())
      .filter(([key]) => key.endsWith(`:${ip}`))
      .reduce((sum, [, v]) => sum + v.count, 0);

    if (failedAttempts > 10) {
      score -= 30;
      riskFactors.push('multiple_failed_logins');
    }

    return {
      ip,
      score: Math.max(0, score),
      isVpn: false,
      isProxy: false,
      isTor: false,
      isDatacenter: false,
      riskFactors,
    };
  }

  // ==================== 安全事件 ====================

  /**
   * 记录安全事件
   */
  recordSecurityEvent(
    event: Omit<SecurityEvent, 'id' | 'timestamp'>,
  ): void {
    const fullEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.securityEvents.push(fullEvent);
    this.logger.log(
      `Security event: ${event.type} [${event.severity}] - IP: ${event.ipAddress}`,
    );

    // 保留最近 1000 条
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }
  }

  /**
   * 获取安全事件
   */
  getSecurityEvents(options?: {
    type?: SecurityEventType;
    severity?: string;
    userId?: string;
    ip?: string;
    limit?: number;
  }): SecurityEvent[] {
    let events = [...this.securityEvents];

    if (options?.type) {
      events = events.filter(e => e.type === options.type);
    }
    if (options?.severity) {
      events = events.filter(e => e.severity === options.severity);
    }
    if (options?.userId) {
      events = events.filter(e => e.userId === options.userId);
    }
    if (options?.ip) {
      events = events.filter(e => e.ipAddress === options.ip);
    }

    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, options?.limit || 100);
  }

  // ==================== 安全头部 ====================

  /**
   * 获取安全响应头
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  }
}
