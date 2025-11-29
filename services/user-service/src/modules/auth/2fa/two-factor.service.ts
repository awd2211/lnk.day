import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

import { TwoFactorSecret } from './entities/two-factor-secret.entity';
import { Enable2FAResponseDto, TwoFactorStatusDto } from './dto/two-factor.dto';

@Injectable()
export class TwoFactorService {
  private readonly appName: string;

  constructor(
    @InjectRepository(TwoFactorSecret)
    private readonly twoFactorRepository: Repository<TwoFactorSecret>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.appName = this.configService.get('APP_NAME', 'lnk.day');
  }

  async enable2FA(userId: string, userEmail: string): Promise<Enable2FAResponseDto> {
    // 检查是否已启用
    let twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (twoFactor?.enabled && twoFactor?.verified) {
      throw new BadRequestException('2FA is already enabled');
    }

    // 生成密钥
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();

    // 生成 OTP Auth URL
    const otpAuthUrl = this.generateOtpAuthUrl(secret, userEmail);

    // 生成 QR 码
    const qrCodeUrl = await this.generateQrCode(otpAuthUrl);

    // 保存或更新
    if (twoFactor) {
      twoFactor.secret = this.encryptSecret(secret);
      twoFactor.backupCodes = backupCodes.map((code) => this.hashBackupCode(code));
      twoFactor.verified = false;
      twoFactor.enabled = false;
    } else {
      twoFactor = this.twoFactorRepository.create({
        userId,
        secret: this.encryptSecret(secret),
        backupCodes: backupCodes.map((code) => this.hashBackupCode(code)),
        verified: false,
        enabled: false,
      });
    }

    await this.twoFactorRepository.save(twoFactor);

    return {
      secret,
      qrCodeUrl,
      otpAuthUrl,
      backupCodes,
    };
  }

  async verify2FA(userId: string, code: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (!twoFactor) {
      throw new NotFoundException('2FA not set up');
    }

    const secret = this.decryptSecret(twoFactor.secret);
    const isValid = this.verifyTOTP(secret, code);

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // 标记为已验证并启用
    twoFactor.verified = true;
    twoFactor.enabled = true;
    twoFactor.lastUsedAt = new Date();
    await this.twoFactorRepository.save(twoFactor);

    return true;
  }

  async disable2FA(userId: string, code: string): Promise<void> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (!twoFactor || !twoFactor.enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // 验证代码
    const secret = this.decryptSecret(twoFactor.secret);
    const isValidTOTP = this.verifyTOTP(secret, code);
    const isValidBackup = this.verifyBackupCode(twoFactor, code);

    if (!isValidTOTP && !isValidBackup) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // 删除 2FA 配置
    await this.twoFactorRepository.remove(twoFactor);
  }

  async validateLogin(userId: string, code: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (!twoFactor || !twoFactor.enabled) {
      return true; // 未启用 2FA，直接通过
    }

    const secret = this.decryptSecret(twoFactor.secret);

    // 首先尝试 TOTP
    if (this.verifyTOTP(secret, code)) {
      twoFactor.lastUsedAt = new Date();
      await this.twoFactorRepository.save(twoFactor);
      return true;
    }

    // 然后尝试备份码
    if (this.verifyBackupCode(twoFactor, code)) {
      twoFactor.lastUsedAt = new Date();
      await this.twoFactorRepository.save(twoFactor);
      return true;
    }

    throw new UnauthorizedException('Invalid 2FA code');
  }

  async getStatus(userId: string): Promise<TwoFactorStatusDto> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (!twoFactor) {
      return {
        enabled: false,
        verified: false,
        backupCodesRemaining: 0,
        lastUsedAt: null,
      };
    }

    const usedCodes = twoFactor.backupCodesUsed || 0;
    const totalCodes = twoFactor.backupCodes?.length || 0;

    return {
      enabled: twoFactor.enabled,
      verified: twoFactor.verified,
      backupCodesRemaining: totalCodes - usedCodes,
      lastUsedAt: twoFactor.lastUsedAt,
    };
  }

  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (!twoFactor || !twoFactor.enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // 验证 TOTP
    const secret = this.decryptSecret(twoFactor.secret);
    if (!this.verifyTOTP(secret, code)) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // 生成新的备份码
    const backupCodes = this.generateBackupCodes();
    twoFactor.backupCodes = backupCodes.map((c) => this.hashBackupCode(c));
    twoFactor.backupCodesUsed = 0;
    await this.twoFactorRepository.save(twoFactor);

    return backupCodes;
  }

  async isEnabled(userId: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });
    return twoFactor?.enabled && twoFactor?.verified || false;
  }

  generateTempToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: '2fa_pending' },
      { expiresIn: '5m' },
    );
  }

  verifyTempToken(token: string): string | null {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type === '2fa_pending') {
        return payload.sub;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ========== 私有方法 ==========

  private generateSecret(): string {
    // 生成 20 字节的随机密钥，Base32 编码
    const buffer = crypto.randomBytes(20);
    return this.base32Encode(buffer);
  }

  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    return codes;
  }

  private generateOtpAuthUrl(secret: string, email: string): string {
    const issuer = encodeURIComponent(this.appName);
    const account = encodeURIComponent(email);
    return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }

  private async generateQrCode(otpAuthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUrl);
  }

  private verifyTOTP(secret: string, code: string): boolean {
    // TOTP 验证，允许 ±1 时间窗口
    const windows = [-1, 0, 1];

    for (const window of windows) {
      const expectedCode = this.generateTOTP(secret, window);
      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  }

  private generateTOTP(secret: string, timeOffset: number = 0): string {
    const period = 30;
    const digits = 6;

    const time = Math.floor(Date.now() / 1000 / period) + timeOffset;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const secretBuffer = this.base32Decode(secret);
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1]! & 0x0f;
    const binary =
      ((hash[offset]! & 0x7f) << 24) |
      ((hash[offset + 1]! & 0xff) << 16) |
      ((hash[offset + 2]! & 0xff) << 8) |
      (hash[offset + 3]! & 0xff);

    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
  }

  private verifyBackupCode(twoFactor: TwoFactorSecret, code: string): boolean {
    const normalizedCode = code.toUpperCase().replace(/-/g, '');
    const hashedInput = this.hashBackupCode(code);

    const index = twoFactor.backupCodes?.findIndex(
      (storedHash) => storedHash === hashedInput,
    );

    if (index !== undefined && index !== -1) {
      // 移除已使用的备份码
      twoFactor.backupCodes!.splice(index, 1);
      twoFactor.backupCodesUsed = (twoFactor.backupCodesUsed || 0) + 1;
      return true;
    }

    return false;
  }

  private encryptSecret(secret: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decryptSecret(encryptedSecret: string): string {
    const key = this.getEncryptionKey();
    const [ivHex, authTagHex, encrypted] = encryptedSecret.split(':');

    const iv = Buffer.from(ivHex!, 'hex');
    const authTag = Buffer.from(authTagHex!, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private getEncryptionKey(): Buffer {
    const secret = this.configService.get('TWO_FACTOR_SECRET');
    if (!secret) {
      throw new Error('TWO_FACTOR_SECRET environment variable is required for 2FA');
    }
    return crypto.scryptSync(secret, 'salt', 32);
  }

  private hashBackupCode(code: string): string {
    const normalized = code.toUpperCase().replace(/-/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  private base32Decode(input: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanInput = input.toUpperCase().replace(/=+$/, '');

    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of cleanInput) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }
}
