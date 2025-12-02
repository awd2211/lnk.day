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
import { UnifiedJwtPayload, Scope } from '@lnk/nestjs-common';
import { AdminRoleService } from '../system/admin-role.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly notificationServiceUrl: string;
  private readonly consoleUrl: string;
  private readonly brandName: string;

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly adminRoleService: AdminRoleService,
  ) {
    this.notificationServiceUrl = this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020');
    this.consoleUrl = this.configService.get('CONSOLE_URL', 'http://localhost:60011');
    this.brandName = this.configService.get('BRAND_NAME', 'lnk.day');
  }

  async login(email: string, password: string, rememberMe = false, twoFactorCode?: string) {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.password) {
      throw new UnauthorizedException('请先通过邀请链接设置密码');
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

    // 构建精简的 JWT payload（不包含 permissions，权限从角色实时计算）
    const scope: Scope = { level: 'platform' };
    const roleName = admin.roleEntity.name;
    const permissions = admin.roleEntity.permissions; // 仅用于返回给前端显示

    const payload: Omit<UnifiedJwtPayload, 'iat' | 'exp'> = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      type: 'admin',
      scope,
      role: roleName,
      customRoleId: admin.roleId,
      pv: admin.permissionVersion || 1,
    };

    const expiresIn = rememberMe ? '7d' : '8h';
    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.roleEntity.name,
        roleId: admin.roleId,
        roleEntity: {
          id: admin.roleEntity.id,
          name: admin.roleEntity.name,
          color: admin.roleEntity.color,
        },
        permissions, // 返回给前端用于 UI 显示
        twoFactorEnabled: admin.twoFactorEnabled,
      },
      accessToken: this.jwtService.sign(payload, { expiresIn }),
    };
  }

  /**
   * 发送登录验证码
   */
  async sendLoginCode(email: string): Promise<{ message: string }> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin || admin.status !== 'active') {
      // Don't reveal if email exists
      return { message: '如果该邮箱存在，验证码已发送' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    admin.loginCode = hashedCode;
    admin.loginCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await this.adminRepository.save(admin);

    // Send login code email
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
          to: email,
          subject: `登录验证码 - ${this.brandName} 管理后台`,
          template: 'admin-login-code',
          data: {
            name: admin.name,
            code,
            expiresIn: '5 分钟',
          },
        }),
      );
      this.logger.log(`Login code email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send login code email to ${email}`, error);
    }

    return { message: '如果该邮箱存在，验证码已发送' };
  }

  /**
   * 使用验证码登录
   */
  async loginWithCode(email: string, code: string, rememberMe = false) {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('验证码无效或已过期');
    }

    if (!admin.loginCode || !admin.loginCodeExpires) {
      throw new UnauthorizedException('验证码无效或已过期');
    }

    if (admin.loginCodeExpires < new Date()) {
      throw new UnauthorizedException('验证码已过期，请重新获取');
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (admin.loginCode !== hashedCode) {
      throw new UnauthorizedException('验证码无效');
    }

    // Clear login code after successful verification
    admin.loginCode = undefined;
    admin.loginCodeExpires = undefined;
    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    // 构建精简的 JWT payload（不包含 permissions，权限从角色实时计算）
    const scope: Scope = { level: 'platform' };
    const roleName = admin.roleEntity.name;
    const permissions = admin.roleEntity.permissions; // 仅用于返回给前端显示

    const payload: Omit<UnifiedJwtPayload, 'iat' | 'exp'> = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      type: 'admin',
      scope,
      role: roleName,
      customRoleId: admin.roleId,
      pv: admin.permissionVersion || 1,
    };

    const expiresIn = rememberMe ? '7d' : '8h';
    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.roleEntity.name,
        roleId: admin.roleId,
        roleEntity: {
          id: admin.roleEntity.id,
          name: admin.roleEntity.name,
          color: admin.roleEntity.color,
        },
        permissions, // 返回给前端用于 UI 显示
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
          subject: `重置密码 - ${this.brandName} 管理后台`,
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

  /**
   * 邀请管理员 - 发送邀请邮件
   */
  async invite(data: { email: string; name: string; roleId: string }): Promise<Admin> {
    if (!data.roleId) {
      throw new BadRequestException('角色ID是必填项');
    }

    // 检查邮箱是否已存在
    const existing = await this.adminRepository.findOne({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('该邮箱已被使用');
    }

    // 验证角色存在
    await this.adminRoleService.findOne(data.roleId);

    // 生成邀请 token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(inviteToken).digest('hex');

    const admin = this.adminRepository.create({
      email: data.email,
      name: data.name,
      roleId: data.roleId,
      status: 'pending',
      inviteToken: hashedToken,
      inviteExpires: new Date(Date.now() + 7 * 24 * 3600000), // 7 days
    });
    const savedAdmin = await this.adminRepository.save(admin);

    // 发送邀请邮件
    await this.sendInviteEmail(savedAdmin, inviteToken);

    return savedAdmin;
  }

  /**
   * 发送邀请邮件
   */
  private async sendInviteEmail(admin: Admin, inviteToken: string) {
    const inviteLink = `${this.consoleUrl}/accept-invite?token=${inviteToken}`;
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
          to: admin.email,
          subject: `邀请加入 ${this.brandName} 管理后台`,
          template: 'admin-invite',
          data: {
            name: admin.name,
            inviteLink,
            expiresIn: '7 天',
            roleName: admin.roleEntity?.name || '管理员',
          },
        }),
      );
      this.logger.log(`Invite email sent to ${admin.email}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email to ${admin.email}`, error);
      // 不抛出错误，邀请已创建成功
    }
  }

  /**
   * 重发邀请邮件
   */
  async resendInvite(id: string): Promise<{ message: string }> {
    const admin = await this.findOne(id);

    if (admin.status !== 'pending') {
      throw new BadRequestException('只能对待激活的管理员重发邀请');
    }

    // 生成新的邀请 token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(inviteToken).digest('hex');

    admin.inviteToken = hashedToken;
    admin.inviteExpires = new Date(Date.now() + 7 * 24 * 3600000); // 7 days
    await this.adminRepository.save(admin);

    // 发送邀请邮件
    await this.sendInviteEmail(admin, inviteToken);

    return { message: '邀请邮件已重新发送' };
  }

  /**
   * 接受邀请 - 设置密码并激活账户
   */
  async acceptInvite(token: string, password: string): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await this.adminRepository.findOne({
      where: { inviteToken: hashedToken },
    });

    if (!admin) {
      throw new BadRequestException('邀请链接无效');
    }

    if (!admin.inviteExpires || admin.inviteExpires < new Date()) {
      throw new BadRequestException('邀请链接已过期，请联系管理员重新发送邀请');
    }

    if (admin.status !== 'pending') {
      throw new BadRequestException('该账户已激活');
    }

    // 设置密码并激活
    admin.password = await bcrypt.hash(password, 10);
    admin.status = 'active';
    admin.inviteToken = undefined;
    admin.inviteExpires = undefined;
    await this.adminRepository.save(admin);

    return { message: '账户激活成功，请登录' };
  }

  /**
   * 验证邀请 token 是否有效
   */
  async validateInviteToken(token: string): Promise<{ valid: boolean; admin?: { email: string; name: string } }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await this.adminRepository.findOne({
      where: { inviteToken: hashedToken },
    });

    if (!admin || !admin.inviteExpires || admin.inviteExpires < new Date() || admin.status !== 'pending') {
      return { valid: false };
    }

    return {
      valid: true,
      admin: {
        email: admin.email,
        name: admin.name,
      },
    };
  }

  /**
   * 直接创建管理员（用于系统初始化等场景）
   */
  async create(data: { email: string; name: string; password: string; roleId: string }): Promise<Admin> {
    if (!data.roleId) {
      throw new BadRequestException('角色ID是必填项');
    }

    // 验证角色存在
    await this.adminRoleService.findOne(data.roleId);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const admin = this.adminRepository.create({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      roleId: data.roleId,
      status: 'active',
    });
    return this.adminRepository.save(admin);
  }

  async update(id: string, data: { name?: string; roleId?: string; status?: 'pending' | 'active' | 'suspended'; password?: string }): Promise<Admin> {
    const admin = await this.findOne(id);

    if (data.password) {
      admin.password = await bcrypt.hash(data.password, 10);
    }

    if (data.roleId) {
      // 验证角色存在
      await this.adminRoleService.findOne(data.roleId);
      admin.roleId = data.roleId;
    }

    if (data.name !== undefined) {
      admin.name = data.name;
    }

    if (data.status !== undefined) {
      admin.status = data.status;
    }

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
      emailVerified: admin.emailVerified,
      pendingEmail: admin.pendingEmail,
      emailChangeOldVerified: admin.emailChangeOldVerified,
      name: admin.name,
      role: admin.roleEntity.name,
      roleId: admin.roleId,
      roleEntity: {
        id: admin.roleEntity.id,
        name: admin.roleEntity.name,
        color: admin.roleEntity.color,
      },
      twoFactorEnabled: admin.twoFactorEnabled,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  async updateProfile(id: string, data: { name?: string }) {
    const admin = await this.findOne(id);
    if (data.name) admin.name = data.name;

    await this.adminRepository.save(admin);

    return {
      id: admin.id,
      email: admin.email,
      emailVerified: admin.emailVerified,
      pendingEmail: admin.pendingEmail,
      emailChangeOldVerified: admin.emailChangeOldVerified,
      name: admin.name,
      role: admin.roleEntity.name,
      roleId: admin.roleId,
      twoFactorEnabled: admin.twoFactorEnabled,
    };
  }

  // ==================== Secure Email Change Flow ====================

  /**
   * 步骤1: 请求更换邮箱 - 发送验证码到旧邮箱
   */
  async requestEmailChange(id: string, newEmail: string): Promise<{ message: string }> {
    const admin = await this.findOne(id);

    // 检查新邮箱是否与当前邮箱相同
    if (newEmail === admin.email) {
      throw new BadRequestException('新邮箱不能与当前邮箱相同');
    }

    // 检查新邮箱是否已被使用
    const existing = await this.adminRepository.findOne({ where: { email: newEmail } });
    if (existing) {
      throw new BadRequestException('该邮箱已被使用');
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    // 保存待更换邮箱和验证码
    admin.pendingEmail = newEmail;
    admin.emailChangeCode = hashedCode;
    admin.emailChangeCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    admin.emailChangeOldVerified = false;
    await this.adminRepository.save(admin);

    // 发送验证码到旧邮箱
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
          to: admin.email,
          subject: `邮箱更换验证码 - ${this.brandName} 管理后台`,
          template: 'admin-email-change-code',
          data: {
            name: admin.name,
            code,
            newEmail,
            expiresIn: '10 分钟',
          },
        }),
      );
      this.logger.log(`Email change verification code sent to ${admin.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email change code to ${admin.email}`, error);
    }

    return { message: '验证码已发送到您的当前邮箱，请查收' };
  }

  /**
   * 步骤2: 验证旧邮箱验证码
   */
  async verifyOldEmailForChange(id: string, code: string): Promise<{ message: string }> {
    const admin = await this.findOne(id);

    if (!admin.pendingEmail || !admin.emailChangeCode) {
      throw new BadRequestException('请先请求邮箱更换');
    }

    if (!admin.emailChangeCodeExpires || admin.emailChangeCodeExpires < new Date()) {
      // 清除过期数据
      admin.pendingEmail = null as any;
      admin.emailChangeCode = null as any;
      admin.emailChangeCodeExpires = null as any;
      admin.emailChangeOldVerified = false;
      await this.adminRepository.save(admin);
      throw new BadRequestException('验证码已过期，请重新请求邮箱更换');
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (admin.emailChangeCode !== hashedCode) {
      throw new BadRequestException('验证码无效');
    }

    // 标记旧邮箱已验证
    admin.emailChangeOldVerified = true;
    admin.emailChangeCode = null as any;
    admin.emailChangeCodeExpires = null as any;
    await this.adminRepository.save(admin);

    // 自动发送验证邮件到新邮箱
    await this.sendEmailChangeVerification(admin);

    return { message: '验证成功，验证邮件已发送到新邮箱，请查收并验证' };
  }

  /**
   * 重新发送邮箱更换验证码到旧邮箱
   */
  async resendEmailChangeCode(id: string): Promise<{ message: string }> {
    const admin = await this.findOne(id);

    if (!admin.pendingEmail) {
      throw new BadRequestException('没有待验证的邮箱更换请求');
    }

    if (admin.emailChangeOldVerified) {
      throw new BadRequestException('旧邮箱已验证，请完成新邮箱验证');
    }

    // 生成新的验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    admin.emailChangeCode = hashedCode;
    admin.emailChangeCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.adminRepository.save(admin);

    // 发送验证码到旧邮箱
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
          to: admin.email,
          subject: `邮箱更换验证码 - ${this.brandName} 管理后台`,
          template: 'admin-email-change-code',
          data: {
            name: admin.name,
            code,
            newEmail: admin.pendingEmail,
            expiresIn: '10 分钟',
          },
        }),
      );
      this.logger.log(`Email change verification code resent to ${admin.email}`);
    } catch (error) {
      this.logger.error(`Failed to resend email change code to ${admin.email}`, error);
    }

    return { message: '验证码已重新发送到您的当前邮箱' };
  }

  /**
   * 重新发送新邮箱验证邮件
   */
  async resendNewEmailVerification(id: string): Promise<{ message: string }> {
    const admin = await this.findOne(id);

    if (!admin.pendingEmail) {
      throw new BadRequestException('没有待验证的邮箱更换请求');
    }

    if (!admin.emailChangeOldVerified) {
      throw new BadRequestException('请先验证旧邮箱');
    }

    await this.sendEmailChangeVerification(admin);

    return { message: '验证邮件已发送到新邮箱' };
  }

  /**
   * 发送邮箱更换验证邮件（发送到新邮箱）
   */
  private async sendEmailChangeVerification(admin: Admin): Promise<void> {
    if (!admin.pendingEmail) return;

    // 生成验证 token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verifyToken).digest('hex');

    admin.emailVerifyToken = hashedToken;
    admin.emailVerifyExpires = new Date(Date.now() + 24 * 3600000); // 24 hours
    await this.adminRepository.save(admin);

    // 发送验证邮件到新邮箱
    const verifyLink = `${this.consoleUrl}/verify-email?token=${verifyToken}`;
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
          to: admin.pendingEmail,
          subject: `验证您的新邮箱 - ${this.brandName} 管理后台`,
          template: 'admin-email-verify',
          data: {
            name: admin.name,
            verifyLink,
            expiresIn: '24 小时',
            isEmailChange: true,
            newEmail: admin.pendingEmail,
          },
        }),
      );
      this.logger.log(`Email change verification sent to ${admin.pendingEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send email change verification to ${admin.pendingEmail}`, error);
    }
  }

  // ==================== Email Verification ====================

  /**
   * 发送邮箱验证邮件
   */
  async sendEmailVerification(id: string): Promise<{ message: string }> {
    const admin = await this.findOne(id);

    if (admin.emailVerified) {
      throw new BadRequestException('邮箱已验证');
    }

    // 生成验证 token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verifyToken).digest('hex');

    admin.emailVerifyToken = hashedToken;
    admin.emailVerifyExpires = new Date(Date.now() + 24 * 3600000); // 24 hours
    await this.adminRepository.save(admin);

    // 发送验证邮件
    const verifyLink = `${this.consoleUrl}/verify-email?token=${verifyToken}`;
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/v1/email/send`, {
          to: admin.email,
          subject: `验证您的邮箱 - ${this.brandName} 管理后台`,
          template: 'admin-email-verify',
          data: {
            name: admin.name,
            verifyLink,
            expiresIn: '24 小时',
          },
        }),
      );
      this.logger.log(`Email verification sent to ${admin.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email verification to ${admin.email}`, error);
    }

    return { message: '验证邮件已发送，请查收' };
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await this.adminRepository.findOne({
      where: { emailVerifyToken: hashedToken },
    });

    if (!admin) {
      throw new BadRequestException('验证链接无效');
    }

    if (!admin.emailVerifyExpires || admin.emailVerifyExpires < new Date()) {
      throw new BadRequestException('验证链接已过期，请重新发送');
    }

    // 如果是邮箱更换验证，需要先检查旧邮箱是否已验证
    if (admin.pendingEmail) {
      // 检查旧邮箱验证状态
      if (!admin.emailChangeOldVerified) {
        throw new BadRequestException('请先验证当前邮箱');
      }

      // 再次检查新邮箱是否被占用（防止并发情况）
      const existing = await this.adminRepository.findOne({ where: { email: admin.pendingEmail } });
      if (existing) {
        throw new BadRequestException('该邮箱已被其他用户使用');
      }
      admin.email = admin.pendingEmail;
      admin.pendingEmail = null as any;
      admin.emailChangeOldVerified = false;
    }

    admin.emailVerified = true;
    admin.emailVerifyToken = null as any;
    admin.emailVerifyExpires = null as any;
    await this.adminRepository.save(admin);

    return { message: '邮箱验证成功' };
  }

  /**
   * 取消待验证的邮箱更换
   */
  async cancelPendingEmailChange(id: string): Promise<{ message: string }> {
    const admin = await this.findOne(id);

    if (!admin.pendingEmail) {
      throw new BadRequestException('没有待验证的邮箱更换');
    }

    // 清除所有邮箱更换相关字段
    admin.pendingEmail = null as any;
    admin.emailChangeCode = null as any;
    admin.emailChangeCodeExpires = null as any;
    admin.emailChangeOldVerified = false;
    admin.emailVerifyToken = null as any;
    admin.emailVerifyExpires = null as any;
    await this.adminRepository.save(admin);

    return { message: '已取消邮箱更换' };
  }

  /**
   * 验证密码强度
   * @returns { valid: boolean, score: number, errors: string[] }
   */
  private validatePasswordStrength(password: string): { valid: boolean; score: number; errors: string[] } {
    const errors: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length < 8) {
      errors.push('密码长度至少8位');
    } else {
      score += 1;
      if (password.length >= 12) score += 1;
      if (password.length >= 16) score += 1;
    }

    // 包含小写字母
    if (!/[a-z]/.test(password)) {
      errors.push('需要包含小写字母');
    } else {
      score += 1;
    }

    // 包含大写字母
    if (!/[A-Z]/.test(password)) {
      errors.push('需要包含大写字母');
    } else {
      score += 1;
    }

    // 包含数字
    if (!/\d/.test(password)) {
      errors.push('需要包含数字');
    } else {
      score += 1;
    }

    // 包含特殊字符
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('需要包含特殊字符 (!@#$%^&*等)');
    } else {
      score += 1;
    }

    // 常见弱密码检测
    const weakPasswords = ['password', '12345678', 'qwerty', 'admin123', 'letmein', 'welcome', 'monkey', 'dragon'];
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
      errors.push('密码过于简单，请避免使用常见密码');
      score = Math.max(0, score - 2);
    }

    return {
      valid: errors.length === 0,
      score: Math.min(score, 7), // max score is 7
      errors,
    };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const admin = await this.findOne(id);

    if (!admin.password) {
      throw new BadRequestException('请先通过邀请链接设置密码');
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      throw new BadRequestException('当前密码不正确');
    }

    // 验证新密码强度
    const strength = this.validatePasswordStrength(newPassword);
    if (!strength.valid) {
      throw new BadRequestException(`密码强度不足: ${strength.errors.join(', ')}`);
    }

    // 确保新密码与旧密码不同
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
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
    const otpAuthUrl = authenticator.keyuri(admin.email, `${this.brandName} Console`, secret);
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
