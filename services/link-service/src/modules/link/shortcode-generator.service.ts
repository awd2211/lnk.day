import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { Link } from './entities/link.entity';
import { RedisService } from '../../common/redis/redis.service';

// 不同字符集用于不同策略
const CHARSET_DEFAULT = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CHARSET_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CHARSET_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CHARSET_NUMERIC = '0123456789';
const CHARSET_PRONOUNCEABLE = 'aeiouybcdfghjklmnpqrstvwxz'; // 交替元音辅音

// 常见词汇黑名单 (避免生成敏感词)
const BLACKLIST_WORDS = new Set([
  'fuck', 'shit', 'ass', 'damn', 'bitch', 'cunt', 'dick', 'piss',
  'cock', 'porn', 'sex', 'xxx', 'nude', 'naked', 'kill', 'dead',
  'hate', 'nazi', 'terror', 'bomb', 'drug', 'weed', 'meth',
]);

// 保留词 (系统使用)
const RESERVED_WORDS = new Set([
  'api', 'app', 'www', 'admin', 'login', 'signup', 'register',
  'dashboard', 'settings', 'help', 'support', 'docs', 'blog',
  'about', 'contact', 'privacy', 'terms', 'status', 'health',
  'metrics', 'analytics', 'links', 'qr', 'share', 'embed',
]);

export enum ShortCodeStrategy {
  RANDOM = 'random',           // 纯随机
  PRONOUNCEABLE = 'pronounceable', // 可发音
  BRANDED = 'branded',         // 品牌前缀
  MEMORABLE = 'memorable',     // 易记忆 (单词+数字)
  SEQUENTIAL = 'sequential',   // 顺序递增 (base62)
  HASH_BASED = 'hash_based',   // 基于 URL hash
  CUSTOM_PATTERN = 'custom_pattern', // 自定义模式
}

interface GenerateOptions {
  strategy?: ShortCodeStrategy;
  length?: number;
  prefix?: string;        // 品牌前缀
  suffix?: string;        // 后缀
  charset?: string;       // 自定义字符集
  pattern?: string;       // 自定义模式, 如 "AAA-NNN" (A=字母, N=数字)
  urlForHash?: string;    // 用于 hash 策略的 URL
  maxRetries?: number;    // 最大重试次数
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  suggestions?: string[];
}

// 易记忆的单词列表
const MEMORABLE_WORDS = [
  // 动物
  'cat', 'dog', 'fox', 'owl', 'bee', 'bat', 'ant', 'elk',
  // 颜色
  'red', 'blue', 'gold', 'pink', 'cyan', 'lime', 'mint', 'ruby',
  // 自然
  'sun', 'sky', 'sea', 'bay', 'oak', 'ivy', 'elm', 'ash',
  // 动作
  'go', 'run', 'fly', 'hop', 'zip', 'pop', 'tap', 'win',
  // 形容词
  'big', 'hot', 'new', 'top', 'cool', 'fast', 'bold', 'safe',
];

@Injectable()
export class ShortCodeGeneratorService {
  private readonly logger = new Logger(ShortCodeGeneratorService.name);

  // 顺序计数器缓存 key
  private readonly COUNTER_KEY = 'shortcode:counter';

  constructor(
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 生成唯一短码
   */
  async generate(options: GenerateOptions = {}): Promise<string> {
    const strategy = options.strategy || ShortCodeStrategy.RANDOM;
    const maxRetries = options.maxRetries || 10;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;
      let shortCode: string;

      switch (strategy) {
        case ShortCodeStrategy.RANDOM:
          shortCode = this.generateRandom(options);
          break;
        case ShortCodeStrategy.PRONOUNCEABLE:
          shortCode = this.generatePronounceable(options);
          break;
        case ShortCodeStrategy.BRANDED:
          shortCode = this.generateBranded(options);
          break;
        case ShortCodeStrategy.MEMORABLE:
          shortCode = this.generateMemorable(options);
          break;
        case ShortCodeStrategy.SEQUENTIAL:
          shortCode = await this.generateSequential(options);
          break;
        case ShortCodeStrategy.HASH_BASED:
          shortCode = this.generateHashBased(options);
          break;
        case ShortCodeStrategy.CUSTOM_PATTERN:
          shortCode = this.generateCustomPattern(options);
          break;
        default:
          shortCode = this.generateRandom(options);
      }

      // 应用前缀和后缀
      if (options.prefix) {
        shortCode = `${options.prefix}${shortCode}`;
      }
      if (options.suffix) {
        shortCode = `${shortCode}${options.suffix}`;
      }

      // 验证
      const validation = await this.validate(shortCode);
      if (validation.valid) {
        return shortCode;
      }

      this.logger.debug(
        `Short code "${shortCode}" rejected: ${validation.reason}, attempt ${attempts}/${maxRetries}`,
      );
    }

    throw new BadRequestException(
      `Failed to generate unique short code after ${maxRetries} attempts`,
    );
  }

  /**
   * 验证短码
   */
  async validate(shortCode: string): Promise<ValidationResult> {
    // 长度检查
    if (shortCode.length < 3) {
      return { valid: false, reason: 'Too short (minimum 3 characters)' };
    }
    if (shortCode.length > 50) {
      return { valid: false, reason: 'Too long (maximum 50 characters)' };
    }

    // 字符检查
    if (!/^[a-zA-Z0-9_-]+$/.test(shortCode)) {
      return {
        valid: false,
        reason: 'Invalid characters (only letters, numbers, underscore, and hyphen allowed)',
      };
    }

    // 黑名单检查
    const lowerCode = shortCode.toLowerCase();
    for (const word of BLACKLIST_WORDS) {
      if (lowerCode.includes(word)) {
        return {
          valid: false,
          reason: 'Contains prohibited word',
          suggestions: await this.getSuggestions(3),
        };
      }
    }

    // 保留词检查
    if (RESERVED_WORDS.has(lowerCode)) {
      return {
        valid: false,
        reason: 'Reserved word',
        suggestions: await this.getSuggestions(3),
      };
    }

    // 唯一性检查 (先检查缓存，再检查数据库)
    const cached = await this.redisService.getLink(shortCode, 'lnk.day');
    if (cached) {
      return {
        valid: false,
        reason: 'Already exists',
        suggestions: await this.getSuggestions(3),
      };
    }

    const existing = await this.linkRepository.findOne({
      where: { shortCode },
    });
    if (existing) {
      return {
        valid: false,
        reason: 'Already exists',
        suggestions: await this.getSuggestions(3),
      };
    }

    return { valid: true };
  }

  /**
   * 获取短码建议
   */
  async getSuggestions(count: number = 5): Promise<string[]> {
    const suggestions: string[] = [];
    const strategies = [
      ShortCodeStrategy.MEMORABLE,
      ShortCodeStrategy.PRONOUNCEABLE,
      ShortCodeStrategy.RANDOM,
    ];

    for (let i = 0; i < count; i++) {
      const strategy = strategies[i % strategies.length];
      try {
        const code = await this.generate({ strategy, maxRetries: 3 });
        suggestions.push(code);
      } catch {
        // 忽略生成失败
      }
    }

    return suggestions;
  }

  /**
   * 批量生成短码
   */
  async bulkGenerate(
    count: number,
    options: GenerateOptions = {},
  ): Promise<string[]> {
    const codes: string[] = [];
    const usedCodes = new Set<string>();

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 10) {
        attempts++;
        const code = await this.generate(options);
        if (!usedCodes.has(code)) {
          codes.push(code);
          usedCodes.add(code);
          break;
        }
      }
    }

    return codes;
  }

  /**
   * 检查自定义短码可用性
   */
  async checkAvailability(
    shortCode: string,
  ): Promise<{ available: boolean; suggestions?: string[] }> {
    const validation = await this.validate(shortCode);
    return {
      available: validation.valid,
      suggestions: validation.suggestions,
    };
  }

  /**
   * 获取基于 URL 的智能建议
   */
  async getSmartSuggestions(
    url: string,
    count: number = 5,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      const urlObj = new URL(url);

      // 从域名提取
      const domain = urlObj.hostname.replace('www.', '');
      const domainParts = domain.split('.');
      if (domainParts[0] && domainParts[0].length >= 3) {
        const domainCode = domainParts[0].slice(0, 4);
        if ((await this.validate(domainCode)).valid) {
          suggestions.push(domainCode);
        }
      }

      // 从路径提取
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      for (const part of pathParts.slice(0, 2)) {
        const cleaned = part.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
        if (cleaned.length >= 3 && (await this.validate(cleaned)).valid) {
          suggestions.push(cleaned);
        }
      }

      // 基于 URL hash
      const hashCode = this.generateHashBased({ urlForHash: url });
      if ((await this.validate(hashCode)).valid) {
        suggestions.push(hashCode);
      }
    } catch {
      // URL 解析失败，忽略
    }

    // 补充随机建议
    while (suggestions.length < count) {
      try {
        const code = await this.generate({
          strategy: ShortCodeStrategy.MEMORABLE,
          maxRetries: 3,
        });
        if (!suggestions.includes(code)) {
          suggestions.push(code);
        }
      } catch {
        break;
      }
    }

    return suggestions.slice(0, count);
  }

  // ==================== 私有方法 ====================

  /**
   * 随机生成
   */
  private generateRandom(options: GenerateOptions): string {
    const length = options.length || 7;
    const charset = options.charset || CHARSET_DEFAULT;
    const generator = customAlphabet(charset, length);
    return generator();
  }

  /**
   * 可发音生成 (交替元音辅音)
   */
  private generatePronounceable(options: GenerateOptions): string {
    const length = options.length || 6;
    const vowels = 'aeiou';
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    let result = '';

    for (let i = 0; i < length; i++) {
      const chars = i % 2 === 0 ? consonants : vowels;
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
  }

  /**
   * 品牌前缀生成
   */
  private generateBranded(options: GenerateOptions): string {
    const prefix = options.prefix || '';
    const suffixLength = Math.max(4, (options.length || 7) - prefix.length);
    const generator = customAlphabet(CHARSET_LOWERCASE, suffixLength);
    return generator();
  }

  /**
   * 易记忆生成 (单词+数字)
   */
  private generateMemorable(options: GenerateOptions): string {
    const word = MEMORABLE_WORDS[Math.floor(Math.random() * MEMORABLE_WORDS.length)];
    const numLength = (options.length || 6) - word.length;
    const num = numLength > 0
      ? customAlphabet(CHARSET_NUMERIC, Math.max(2, numLength))()
      : '';
    return `${word}${num}`;
  }

  /**
   * 顺序递增生成 (base62)
   */
  private async generateSequential(options: GenerateOptions): Promise<string> {
    // 从 Redis 获取并递增计数器
    const counter = await this.redisService.incr(this.COUNTER_KEY);

    // 转换为 base62
    return this.toBase62(counter + 1000000); // 从 100万 开始，确保一定长度
  }

  /**
   * 基于 URL hash 生成
   */
  private generateHashBased(options: GenerateOptions): string {
    const url = options.urlForHash || '';
    if (!url) {
      return this.generateRandom(options);
    }

    // 简单 hash 算法
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }

    return this.toBase62(Math.abs(hash)).slice(0, options.length || 7);
  }

  /**
   * 自定义模式生成
   * 模式: A=字母, N=数字, X=字母或数字, 其他字符原样保留
   */
  private generateCustomPattern(options: GenerateOptions): string {
    const pattern = options.pattern || 'XXXX-XXXX';
    let result = '';

    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const alphanumeric = letters + numbers;

    for (const char of pattern) {
      switch (char) {
        case 'A':
          result += letters[Math.floor(Math.random() * letters.length)];
          break;
        case 'N':
          result += numbers[Math.floor(Math.random() * numbers.length)];
          break;
        case 'X':
          result += alphanumeric[Math.floor(Math.random() * alphanumeric.length)];
          break;
        default:
          result += char;
      }
    }

    return result;
  }

  /**
   * 数字转 base62
   */
  private toBase62(num: number): string {
    const chars = CHARSET_DEFAULT;
    let result = '';

    while (num > 0) {
      result = chars[num % 62] + result;
      num = Math.floor(num / 62);
    }

    return result || '0';
  }
}
