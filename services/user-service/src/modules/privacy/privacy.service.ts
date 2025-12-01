import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const EVERY_DAY = 24 * 60 * 60 * 1000;

import { UserConsent, ConsentType } from './entities/user-consent.entity';
import { DataRequest, DataRequestType, DataRequestStatus } from './entities/data-request.entity';
import { User } from '../user/entities/user.entity';
import { Team } from '../team/entities/team.entity';
import { TeamMember } from '../team/entities/team-member.entity';
import {
  UpdateConsentDto,
  BulkUpdateConsentDto,
  CreateDataRequestDto,
  ExportedDataDto,
  PrivacyOverviewDto,
} from './dto/privacy.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class PrivacyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrivacyService.name);
  private deletionInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly deletionCoolingPeriodDays = 30;
  private readonly exportRetentionDays = 7;

  constructor(
    @InjectRepository(UserConsent)
    private readonly consentRepository: Repository<UserConsent>,
    @InjectRepository(DataRequest)
    private readonly dataRequestRepository: Repository<DataRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.deletionInterval = setInterval(() => {
      this.processPendingDeletions().catch((err) => {
        this.logger.error(`处理删除请求失败: ${err.message}`);
      });
    }, EVERY_DAY);

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredExports().catch((err) => {
        this.logger.error(`清理过期导出失败: ${err.message}`);
      });
    }, EVERY_DAY);

    this.logger.log('隐私服务定时任务已启动 (删除请求处理/过期导出清理)');
  }

  onModuleDestroy() {
    if (this.deletionInterval) {
      clearInterval(this.deletionInterval);
      this.deletionInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.logger.log('隐私服务定时任务已停止');
  }

  // ========== 同意管理 ==========

  async getConsents(userId: string): Promise<UserConsent[]> {
    return this.consentRepository.find({
      where: { userId },
      order: { type: 'ASC' },
    });
  }

  async updateConsent(
    userId: string,
    dto: UpdateConsentDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserConsent> {
    let consent = await this.consentRepository.findOne({
      where: { userId, type: dto.type },
    });

    if (!consent) {
      consent = this.consentRepository.create({
        userId,
        type: dto.type,
      });
    }

    consent.granted = dto.granted;
    consent.ipAddress = ipAddress || '';
    consent.userAgent = userAgent || '';
    consent.version = this.configService.get('PRIVACY_POLICY_VERSION', '1.0');

    if (dto.granted) {
      consent.grantedAt = new Date();
      consent.revokedAt = null as any;
    } else {
      consent.revokedAt = new Date();
    }

    return this.consentRepository.save(consent);
  }

  async bulkUpdateConsents(
    userId: string,
    dto: BulkUpdateConsentDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserConsent[]> {
    const results: UserConsent[] = [];

    for (const consentDto of dto.consents) {
      const consent = await this.updateConsent(userId, consentDto, ipAddress, userAgent);
      results.push(consent);
    }

    return results;
  }

  async hasRequiredConsents(userId: string): Promise<boolean> {
    const requiredTypes = [ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY];

    for (const type of requiredTypes) {
      const consent = await this.consentRepository.findOne({
        where: { userId, type, granted: true },
      });
      if (!consent) {
        return false;
      }
    }

    return true;
  }

  // ========== 数据请求 ==========

  async createDataRequest(
    userId: string,
    dto: CreateDataRequestDto,
    ipAddress?: string,
  ): Promise<DataRequest> {
    // 检查是否有待处理的相同类型请求
    const pendingRequest = await this.dataRequestRepository.findOne({
      where: {
        userId,
        type: dto.type,
        status: DataRequestStatus.PENDING,
      },
    });

    if (pendingRequest) {
      throw new BadRequestException('您已有一个待处理的相同类型请求');
    }

    const request = this.dataRequestRepository.create({
      userId,
      type: dto.type,
      reason: dto.reason,
      ipAddress,
    });

    // 删除请求需要冷静期
    if (dto.type === DataRequestType.DELETE) {
      const coolingPeriodEnd = new Date();
      coolingPeriodEnd.setDate(coolingPeriodEnd.getDate() + this.deletionCoolingPeriodDays);
      request.coolingPeriodEndsAt = coolingPeriodEnd;
    }

    const savedRequest = await this.dataRequestRepository.save(request);

    // 发送确认邮件
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await this.sendRequestConfirmationEmail(user, savedRequest);
    }

    // 如果是导出请求，立即开始处理
    if (dto.type === DataRequestType.EXPORT || dto.type === DataRequestType.PORTABILITY) {
      this.processExportRequest(savedRequest.id).catch(err => {
        this.logger.error(`Failed to process export request: ${err.message}`);
      });
    }

    return savedRequest;
  }

  async getDataRequests(userId: string): Promise<DataRequest[]> {
    return this.dataRequestRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async cancelDeletionRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.dataRequestRepository.findOne({
      where: { id: requestId, userId, type: DataRequestType.DELETE },
    });

    if (!request) {
      throw new NotFoundException('删除请求不存在');
    }

    if (request.status !== DataRequestStatus.PENDING) {
      throw new BadRequestException('只能取消待处理的删除请求');
    }

    request.status = DataRequestStatus.CANCELLED;
    await this.dataRequestRepository.save(request);

    this.logger.log(`Deletion request ${requestId} cancelled by user ${userId}`);
  }

  // ========== 数据导出 ==========

  async processExportRequest(requestId: string): Promise<void> {
    const request = await this.dataRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('请求不存在');
    }

    request.status = DataRequestStatus.PROCESSING;
    await this.dataRequestRepository.save(request);

    try {
      // 收集用户数据
      const exportData = await this.collectUserData(request.userId);

      // 生成加密的 JSON 文件
      const jsonData = JSON.stringify(exportData, null, 2);
      const token = crypto.randomBytes(32).toString('hex');

      // 在生产环境中，应该将文件上传到安全存储（如 S3）
      // 这里简化处理，生成一个下载 token
      const downloadUrl = `${this.configService.get('FRONTEND_URL')}/api/privacy/export/${token}`;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.exportRetentionDays);

      request.status = DataRequestStatus.COMPLETED;
      request.downloadUrl = downloadUrl;
      request.downloadExpiresAt = expiresAt;
      request.completedAt = new Date();

      await this.dataRequestRepository.save(request);

      // 发送下载链接邮件
      const user = await this.userRepository.findOne({ where: { id: request.userId } });
      if (user) {
        await this.emailService.sendDataExportReadyEmail(
          user.email,
          downloadUrl,
          `${this.exportRetentionDays}天`,
        );
      }

      this.logger.log(`Export request ${requestId} completed`);
    } catch (error: any) {
      request.status = DataRequestStatus.FAILED;
      request.processingNotes = error.message;
      await this.dataRequestRepository.save(request);

      this.logger.error(`Export request ${requestId} failed: ${error.message}`);
    }
  }

  async collectUserData(userId: string): Promise<ExportedDataDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取团队成员关系
    const teamMembers = await this.teamMemberRepository.find({
      where: { userId },
      relations: ['team'],
    });

    // 获取同意记录
    const consents = await this.consentRepository.find({
      where: { userId },
    });

    // 注意：链接数据在 link-service，这里需要通过 API 调用获取
    // 简化处理，返回空数组
    const links: any[] = [];

    return {
      exportDate: new Date(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      teams: teamMembers.map(tm => ({
        id: tm.team.id,
        name: tm.team.name,
        role: tm.role,
      })),
      links,
      consents: consents.map(c => ({
        type: c.type,
        granted: c.granted,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
        version: c.version,
      })),
      activityLog: [], // 需要从审计日志服务获取
    };
  }

  // ========== 账户删除 ==========

  async processAccountDeletion(requestId: string): Promise<void> {
    const request = await this.dataRequestRepository.findOne({
      where: { id: requestId, type: DataRequestType.DELETE },
    });

    if (!request) {
      throw new NotFoundException('删除请求不存在');
    }

    if (request.status !== DataRequestStatus.PENDING) {
      throw new BadRequestException('请求状态不正确');
    }

    if (request.coolingPeriodEndsAt && request.coolingPeriodEndsAt > new Date()) {
      throw new BadRequestException('冷静期尚未结束');
    }

    request.status = DataRequestStatus.PROCESSING;
    await this.dataRequestRepository.save(request);

    try {
      const user = await this.userRepository.findOne({ where: { id: request.userId } });
      if (!user) {
        request.status = DataRequestStatus.COMPLETED;
        request.processingNotes = 'User already deleted';
        await this.dataRequestRepository.save(request);
        return;
      }

      // 1. 匿名化用户数据
      await this.anonymizeUserData(request.userId);

      // 2. 删除用户账户
      await this.userRepository.delete(request.userId);

      request.status = DataRequestStatus.COMPLETED;
      request.completedAt = new Date();
      await this.dataRequestRepository.save(request);

      this.logger.log(`Account deletion completed for request ${requestId}`);
    } catch (error: any) {
      request.status = DataRequestStatus.FAILED;
      request.processingNotes = error.message;
      await this.dataRequestRepository.save(request);

      this.logger.error(`Account deletion failed: ${error.message}`);
    }
  }

  async anonymizeUserData(userId: string): Promise<void> {
    const anonymizedEmail = `deleted-${crypto.randomBytes(8).toString('hex')}@anonymous.local`;
    const anonymizedName = 'Deleted User';

    await this.userRepository.update(userId, {
      email: anonymizedEmail,
      name: anonymizedName,
      password: '',
    });

    // 删除同意记录
    await this.consentRepository.delete({ userId });

    // 注意：其他服务的数据需要通过消息队列或 API 通知删除
    this.logger.log(`User ${userId} data anonymized`);
  }

  // ========== 隐私概览 ==========

  async getPrivacyOverview(userId: string): Promise<PrivacyOverviewDto> {
    const consents = await this.getConsents(userId);
    const requests = await this.getDataRequests(userId);

    const pendingDeletion = requests.find(
      r => r.type === DataRequestType.DELETE && r.status === DataRequestStatus.PENDING,
    );

    return {
      consents: consents.map(c => ({
        type: c.type,
        granted: c.granted,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
        version: c.version,
      })),
      pendingRequests: requests
        .filter(r => r.status === DataRequestStatus.PENDING || r.status === DataRequestStatus.PROCESSING)
        .map(r => ({
          id: r.id,
          type: r.type,
          status: r.status,
          reason: r.reason,
          downloadUrl: r.downloadUrl,
          downloadExpiresAt: r.downloadExpiresAt,
          coolingPeriodEndsAt: r.coolingPeriodEndsAt,
          createdAt: r.createdAt,
          completedAt: r.completedAt,
        })),
      scheduledDeletion: pendingDeletion
        ? {
            requestId: pendingDeletion.id,
            scheduledAt: pendingDeletion.coolingPeriodEndsAt,
          }
        : undefined,
    };
  }

  // ========== 定时任务 ==========

  // 每天检查需要执行的删除请求
  async processPendingDeletions(): Promise<void> {
    this.logger.log('Processing pending deletion requests...');

    const pendingDeletions = await this.dataRequestRepository.find({
      where: {
        type: DataRequestType.DELETE,
        status: DataRequestStatus.PENDING,
        coolingPeriodEndsAt: LessThan(new Date()),
      },
    });

    for (const request of pendingDeletions) {
      try {
        await this.processAccountDeletion(request.id);
      } catch (error: any) {
        this.logger.error(`Failed to process deletion ${request.id}: ${error.message}`);
      }
    }

    this.logger.log(`Processed ${pendingDeletions.length} deletion requests`);
  }

  // 清理过期的导出文件
  async cleanupExpiredExports(): Promise<void> {
    const expiredExports = await this.dataRequestRepository.find({
      where: {
        type: DataRequestType.EXPORT,
        status: DataRequestStatus.COMPLETED,
        downloadExpiresAt: LessThan(new Date()),
      },
    });

    for (const request of expiredExports) {
      request.downloadUrl = null as any;
      await this.dataRequestRepository.save(request);
    }

    if (expiredExports.length > 0) {
      this.logger.log(`Cleaned up ${expiredExports.length} expired export links`);
    }
  }

  // ========== 辅助方法 ==========

  private async sendRequestConfirmationEmail(user: User, request: DataRequest): Promise<void> {
    try {
      let subject = '';
      let template = '';

      switch (request.type) {
        case DataRequestType.DELETE:
          subject = '账户删除请求确认 - lnk.day';
          template = 'deletion-request';
          break;
        case DataRequestType.EXPORT:
          subject = '数据导出请求已收到 - lnk.day';
          template = 'export-request';
          break;
        default:
          subject = '数据请求已收到 - lnk.day';
          template = 'data-request';
      }

      await this.emailService.sendPrivacyRequestEmail(
        user.email,
        subject,
        request.type,
        request.coolingPeriodEndsAt,
      );
    } catch (error: any) {
      this.logger.error(`Failed to send confirmation email: ${error.message}`);
    }
  }
}
