import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';
import { Admin } from './entities/admin.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly notificationServiceUrl: string;
  private readonly consoleUrl: string;

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl = this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020');
    this.consoleUrl = this.configService.get('CONSOLE_URL', 'http://localhost:60011');
  }

  async login(email: string, password: string, rememberMe = false, twoFactorCode?: string) {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin || !admin.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (admin.twoFactorEnabled) {
      if (!twoFactorCode) {
        return {
          requiresTwoFactor: true,
          message: '需要双因素认证码',
        };
      }

      const isCodeValid = authenticator.verify({
        token: twoFactorCode,
        secret: admin.twoFactorSecret!,
      });

      if (!isCodeValid) {
        // Check backup codes
        const backupCodes = admin.twoFactorBackupCodes || [];
        const codeIndex = backupCodes.indexOf(twoFactorCode);
        if (codeIndex === -1) {
          throw new UnauthorizedException('双因素认证码无效');
        }
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        admin.twoFactorBackupCodes = backupCodes;
      }
    }

    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    const expiresIn = rememberMe ? '7d' : '8h';
    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        twoFactorEnabled: admin.twoFactorEnabled,
      },
      accessToken: this.jwtService.sign(payload, { expiresIn }),
    };
  }

  async forgotPassword(email: string) {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) {
      // Don't reveal if email exists - just return success
      return { message: '如果该邮箱存在，重置链接已发送' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    admin.passwordResetToken = hashedToken;
    admin.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.adminRepository.save(admin);

    // Send password reset email via notification service
    const resetLink = `${this.consoleUrl}/reset-password?token=${resetToken}`;
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
          to: email,
          subject: '重置密码 - lnk.day 管理后台',
          template: 'admin-password-reset',
          data: {
            name: admin.name,
            resetLink,
            expiresIn: '1 小时',
          },
        }),
      );
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      // Still return success to not reveal if email exists
    }

    return { message: '如果该邮箱存在，重置链接已发送' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await this.adminRepository.findOne({
      where: { passwordResetToken: hashedToken },
    });

    if (!admin || !admin.passwordResetExpires || admin.passwordResetExpires < new Date()) {
      throw new BadRequestException('重置链接无效或已过期');
    }

    // Update password and clear reset token
    admin.password = await bcrypt.hash(newPassword, 10);
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await this.adminRepository.save(admin);

    return { message: '密码重置成功' };
  }

  async findAll(): Promise<Admin[]> {
    return this.adminRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) throw new NotFoundException(`Admin ${id} not found`);
    return admin;
  }

  async create(data: Partial<Admin>): Promise<Admin> {
    if (!data.password) {
      throw new Error('Password is required');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const admin = this.adminRepository.create({ ...data, password: hashedPassword });
    return this.adminRepository.save(admin);
  }

  async update(id: string, data: Partial<Admin>): Promise<Admin> {
    const admin = await this.findOne(id);
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    Object.assign(admin, data);
    return this.adminRepository.save(admin);
  }

  async remove(id: string): Promise<void> {
    const admin = await this.findOne(id);
    await this.adminRepository.remove(admin);
  }

  // ==================== Profile Management ====================

  async getProfile(id: string) {
    const admin = await this.findOne(id);
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      twoFactorEnabled: admin.twoFactorEnabled,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  async updateProfile(id: string, data: { name?: string; email?: string }) {
    const admin = await this.findOne(id);
    if (data.name) admin.name = data.name;
    if (data.email && data.email !== admin.email) {
      // Check if email is already used
      const existing = await this.adminRepository.findOne({ where: { email: data.email } });
      if (existing) {
        throw new BadRequestException('该邮箱已被使用');
      }
      admin.email = data.email;
    }
    await this.adminRepository.save(admin);
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      twoFactorEnabled: admin.twoFactorEnabled,
    };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const admin = await this.findOne(id);

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      throw new BadRequestException('当前密码不正确');
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await this.adminRepository.save(admin);

    return { message: '密码修改成功' };
  }

  // ==================== Two-Factor Authentication ====================

  async setupTwoFactor(id: string) {
    const admin = await this.findOne(id);

    if (admin.twoFactorEnabled) {
      throw new BadRequestException('双因素认证已启用，请先禁用');
    }

    // Generate secret
    const secret = authenticator.generateSecret();
    admin.twoFactorSecret = secret;
    await this.adminRepository.save(admin);

    // Generate QR code
    const otpAuthUrl = authenticator.keyuri(admin.email, 'lnk.day Console', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return {
      secret,
      qrCode: qrCodeDataUrl,
      otpAuthUrl,
    };
  }

  async verifyAndEnableTwoFactor(id: string, code: string) {
    const admin = await this.findOne(id);

    if (!admin.twoFactorSecret) {
      throw new BadRequestException('请先设置双因素认证');
    }

    if (admin.twoFactorEnabled) {
      throw new BadRequestException('双因素认证已启用');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: admin.twoFactorSecret,
    });

    if (!isValid) {
      throw new BadRequestException('验证码无效');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    admin.twoFactorEnabled = true;
    admin.twoFactorBackupCodes = backupCodes;
    await this.adminRepository.save(admin);

    return {
      message: '双因素认证已启用',
      backupCodes,
    };
  }

  async disableTwoFactor(id: string, code: string) {
    const admin = await this.findOne(id);

    if (!admin.twoFactorEnabled) {
      throw new BadRequestException('双因素认证未启用');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: admin.twoFactorSecret!,
    });

    // Also check backup codes
    const backupCodes = admin.twoFactorBackupCodes || [];
    const isBackupCode = backupCodes.includes(code);

    if (!isValid && !isBackupCode) {
      throw new BadRequestException('验证码无效');
    }

    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = undefined;
    admin.twoFactorBackupCodes = undefined;
    await this.adminRepository.save(admin);

    return { message: '双因素认证已禁用' };
  }

  async regenerateBackupCodes(id: string, code: string) {
    const admin = await this.findOne(id);

    if (!admin.twoFactorEnabled) {
      throw new BadRequestException('双因素认证未启用');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: admin.twoFactorSecret!,
    });

    if (!isValid) {
      throw new BadRequestException('验证码无效');
    }

    const backupCodes = this.generateBackupCodes();
    admin.twoFactorBackupCodes = backupCodes;
    await this.adminRepository.save(admin);

    return {
      message: '备用码已重新生成',
      backupCodes,
    };
  }

  private generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}
