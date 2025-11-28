import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QrLimit } from './entities/qr-limit.entity';

export interface CheckLimitResult {
  allowed: boolean;
  reason?: string;
  action?: 'block' | 'redirect' | 'warn';
  redirectUrl?: string;
  message?: string;
}

export interface CreateQrLimitDto {
  qrId: string;
  teamId: string;
  maxScans?: number;
  allowedCountries?: string[];
  blockedCountries?: string[];
  validFrom?: Date;
  validUntil?: Date;
  dailyLimit?: number;
  limitAction?: 'block' | 'redirect' | 'warn';
  limitRedirectUrl?: string;
  limitMessage?: string;
}

export interface UpdateQrLimitDto {
  maxScans?: number;
  allowedCountries?: string[];
  blockedCountries?: string[];
  validFrom?: Date;
  validUntil?: Date;
  dailyLimit?: number;
  enabled?: boolean;
  limitAction?: 'block' | 'redirect' | 'warn';
  limitRedirectUrl?: string;
  limitMessage?: string;
}

@Injectable()
export class QrLimitService {
  constructor(
    @InjectRepository(QrLimit)
    private readonly qrLimitRepository: Repository<QrLimit>,
  ) {}

  async create(dto: CreateQrLimitDto): Promise<QrLimit> {
    const limit = this.qrLimitRepository.create(dto);
    return this.qrLimitRepository.save(limit);
  }

  async findByQrId(qrId: string): Promise<QrLimit | null> {
    return this.qrLimitRepository.findOne({ where: { qrId } });
  }

  async update(qrId: string, dto: UpdateQrLimitDto): Promise<QrLimit> {
    const limit = await this.findByQrId(qrId);
    if (!limit) {
      throw new NotFoundException('QR limit configuration not found');
    }

    Object.assign(limit, dto);
    return this.qrLimitRepository.save(limit);
  }

  async delete(qrId: string): Promise<void> {
    await this.qrLimitRepository.delete({ qrId });
  }

  // 检查扫码是否允许
  async checkLimit(qrId: string, country?: string): Promise<CheckLimitResult> {
    const limit = await this.findByQrId(qrId);

    // 没有配置限制，允许扫码
    if (!limit || !limit.enabled) {
      return { allowed: true };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 检查时间限制
    if (limit.validFrom && now < limit.validFrom) {
      return {
        allowed: false,
        reason: 'QR code is not yet valid',
        action: limit.limitAction,
        redirectUrl: limit.limitRedirectUrl,
        message: limit.limitMessage || 'This QR code is not yet active.',
      };
    }

    if (limit.validUntil && now > limit.validUntil) {
      return {
        allowed: false,
        reason: 'QR code has expired',
        action: limit.limitAction,
        redirectUrl: limit.limitRedirectUrl,
        message: limit.limitMessage || 'This QR code has expired.',
      };
    }

    // 检查总扫码次数限制
    if (limit.maxScans && limit.currentScans >= limit.maxScans) {
      return {
        allowed: false,
        reason: 'Maximum scan limit reached',
        action: limit.limitAction,
        redirectUrl: limit.limitRedirectUrl,
        message: limit.limitMessage || 'This QR code has reached its scan limit.',
      };
    }

    // 检查每日扫码限制
    if (limit.dailyLimit) {
      const lastScanDate = limit.lastScanDate?.toISOString().split('T')[0];

      // 如果是新的一天，重置计数
      if (lastScanDate !== today) {
        limit.todayScans = 0;
        limit.lastScanDate = now;
      }

      if (limit.todayScans >= limit.dailyLimit) {
        return {
          allowed: false,
          reason: 'Daily scan limit reached',
          action: limit.limitAction,
          redirectUrl: limit.limitRedirectUrl,
          message: limit.limitMessage || 'Daily scan limit has been reached. Please try again tomorrow.',
        };
      }
    }

    // 检查地理围栏
    if (country) {
      const upperCountry = country.toUpperCase();

      // 检查黑名单
      if (limit.blockedCountries?.length > 0) {
        if (limit.blockedCountries.map(c => c.toUpperCase()).includes(upperCountry)) {
          return {
            allowed: false,
            reason: 'Country is blocked',
            action: limit.limitAction,
            redirectUrl: limit.limitRedirectUrl,
            message: limit.limitMessage || 'This QR code is not available in your region.',
          };
        }
      }

      // 检查白名单
      if (limit.allowedCountries?.length > 0) {
        if (!limit.allowedCountries.map(c => c.toUpperCase()).includes(upperCountry)) {
          return {
            allowed: false,
            reason: 'Country is not in allowed list',
            action: limit.limitAction,
            redirectUrl: limit.limitRedirectUrl,
            message: limit.limitMessage || 'This QR code is not available in your region.',
          };
        }
      }
    }

    return { allowed: true };
  }

  // 记录一次扫码
  async recordScan(qrId: string): Promise<void> {
    const limit = await this.findByQrId(qrId);
    if (!limit) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastScanDate = limit.lastScanDate?.toISOString().split('T')[0];

    // 更新计数
    limit.currentScans += 1;

    if (lastScanDate !== today) {
      limit.todayScans = 1;
      limit.lastScanDate = now;
    } else {
      limit.todayScans += 1;
    }

    await this.qrLimitRepository.save(limit);
  }

  // 获取统计信息
  async getStats(qrId: string): Promise<{
    totalScans: number;
    todayScans: number;
    maxScans: number | null;
    dailyLimit: number | null;
    remainingTotal: number | null;
    remainingToday: number | null;
  } | null> {
    const limit = await this.findByQrId(qrId);
    if (!limit) return null;

    return {
      totalScans: limit.currentScans,
      todayScans: limit.todayScans,
      maxScans: limit.maxScans,
      dailyLimit: limit.dailyLimit,
      remainingTotal: limit.maxScans ? limit.maxScans - limit.currentScans : null,
      remainingToday: limit.dailyLimit ? limit.dailyLimit - limit.todayScans : null,
    };
  }

  // 重置扫码计数
  async resetScans(qrId: string, type: 'all' | 'daily' = 'all'): Promise<void> {
    const limit = await this.findByQrId(qrId);
    if (!limit) return;

    if (type === 'all') {
      limit.currentScans = 0;
      limit.todayScans = 0;
    } else {
      limit.todayScans = 0;
    }

    await this.qrLimitRepository.save(limit);
  }
}
