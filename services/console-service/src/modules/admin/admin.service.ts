import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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

  async login(email: string, password: string, rememberMe = false) {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin || !admin.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    const expiresIn = rememberMe ? '7d' : '8h';
    return {
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
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
}
