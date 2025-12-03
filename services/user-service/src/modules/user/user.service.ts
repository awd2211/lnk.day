import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';
import { calculatePasswordStrength, PasswordStrengthResult } from '../../common/utils/password-strength.util';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ items: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (options?.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    // Handle sorting
    if (options?.sortBy) {
      const sortColumn = this.getSortColumn(options.sortBy);
      queryBuilder.orderBy(`user.${sortColumn}`, options.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('user.createdAt', 'DESC');
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private getSortColumn(sortBy: string): string {
    const sortMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      status: 'status',
      plan: 'plan',
      linkCount: 'linkCount',
      createdAt: 'createdAt',
      lastLoginAt: 'lastLoginAt',
    };
    return sortMap[sortBy] || 'createdAt';
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    const result = await this.userRepository.update(id, { password: hashedPassword });
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0, // 登录成功后重置失败计数
      lockedUntil: undefined,
    });
  }

  // ========== 登录安全相关方法 ==========

  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 15;

  /**
   * 检查账户是否被锁定
   */
  isAccountLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    return new Date() < user.lockedUntil;
  }

  /**
   * 获取账户剩余锁定时间（分钟）
   */
  getRemainingLockTime(user: User): number {
    if (!user.lockedUntil) return 0;
    const remaining = user.lockedUntil.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 60000));
  }

  /**
   * 记录登录失败
   */
  async recordFailedLogin(id: string): Promise<{ locked: boolean; remainingAttempts: number; lockMinutes?: number }> {
    const user = await this.findOne(id);
    const newAttempts = (user.failedLoginAttempts || 0) + 1;

    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      // 锁定账户
      const lockedUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
      await this.userRepository.update(id, {
        failedLoginAttempts: newAttempts,
        lockedUntil,
      });
      return { locked: true, remainingAttempts: 0, lockMinutes: this.LOCK_DURATION_MINUTES };
    }

    await this.userRepository.update(id, { failedLoginAttempts: newAttempts });
    return { locked: false, remainingAttempts: this.MAX_LOGIN_ATTEMPTS - newAttempts };
  }

  // ========== 邮箱验证码登录相关方法 ==========

  /**
   * 设置登录验证码
   */
  async setLoginCode(id: string, code: string, expiresAt: Date): Promise<void> {
    await this.userRepository.update(id, {
      loginCode: code,
      loginCodeExpiresAt: expiresAt,
    });
  }

  /**
   * 清除登录验证码
   */
  async clearLoginCode(id: string): Promise<void> {
    await this.userRepository.update(id, {
      loginCode: undefined,
      loginCodeExpiresAt: undefined,
    });
  }

  /**
   * 解锁账户
   */
  async unlockAccount(id: string): Promise<void> {
    await this.userRepository.update(id, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findOne(id);

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('当前密码不正确');
    }

    // 检查新密码不能与当前密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.updatePassword(id, hashedPassword);
  }

  /**
   * 检查密码强度
   */
  checkPasswordStrength(password: string): PasswordStrengthResult {
    return calculatePasswordStrength(password || '');
  }

  async suspendUser(id: string, reason?: string): Promise<User> {
    const user = await this.findOne(id);
    user.status = UserStatus.SUSPENDED;
    return this.userRepository.save(user);
  }

  async unsuspendUser(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.status = UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }

  // ========== 邮箱验证相关方法 ==========

  async sendEmailVerification(userId: string): Promise<{ message: string }> {
    const user = await this.findOne(userId);

    if (user.emailVerifiedAt) {
      throw new BadRequestException('邮箱已验证');
    }

    // 生成验证 token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24小时后过期

    // 保存 token 到数据库
    user.emailVerificationToken = token;
    user.emailVerificationTokenExpiresAt = expiresAt;
    await this.userRepository.save(user);

    // 发送验证邮件
    await this.emailService.sendEmailVerificationEmail(user.email, token);

    return { message: '验证邮件已发送，请检查您的邮箱' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('无效的验证链接');
    }

    if (user.emailVerificationTokenExpiresAt && user.emailVerificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('验证链接已过期，请重新发送验证邮件');
    }

    // 标记邮箱已验证
    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiresAt = undefined;
    await this.userRepository.save(user);

    return { message: '邮箱验证成功' };
  }
}
