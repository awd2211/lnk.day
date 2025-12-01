import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationLog, NotificationStatus } from './entities/notification-log.entity';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(NotificationChannel)
    private readonly channelRepo: Repository<NotificationChannel>,
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultTemplates();
    await this.seedDefaultChannels();
  }

  // =================== Templates ===================

  async getTemplates(type?: string): Promise<{ items: NotificationTemplate[]; total: number }> {
    const query = this.templateRepo.createQueryBuilder('template');
    if (type) {
      query.where('template.type = :type', { type });
    }
    query.orderBy('template.category', 'ASC').addOrderBy('template.name', 'ASC');
    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  async getTemplate(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async updateTemplate(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const template = await this.getTemplate(id);
    Object.assign(template, data);
    return this.templateRepo.save(template);
  }

  async resetTemplate(id: string): Promise<NotificationTemplate> {
    const template = await this.getTemplate(id);
    const defaultTemplate = this.getDefaultTemplates().find(t => t.code === template.code);
    if (defaultTemplate) {
      Object.assign(template, {
        name: defaultTemplate.name,
        subject: defaultTemplate.subject,
        content: defaultTemplate.content,
        htmlContent: defaultTemplate.htmlContent,
        variables: defaultTemplate.variables,
      });
      return this.templateRepo.save(template);
    }
    return template;
  }

  // =================== Channels ===================

  async getChannels(): Promise<{ items: NotificationChannel[]; total: number }> {
    const [items, total] = await this.channelRepo.findAndCount({
      order: { type: 'ASC', name: 'ASC' },
    });
    return { items, total };
  }

  async getChannel(id: string): Promise<NotificationChannel> {
    const channel = await this.channelRepo.findOne({ where: { id } });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  async updateChannel(id: string, data: Partial<NotificationChannel>): Promise<NotificationChannel> {
    const channel = await this.getChannel(id);
    Object.assign(channel, data);
    return this.channelRepo.save(channel);
  }

  async toggleChannel(id: string, enabled: boolean): Promise<NotificationChannel> {
    const channel = await this.getChannel(id);
    channel.enabled = enabled;
    return this.channelRepo.save(channel);
  }

  async testChannel(id: string): Promise<{ success: boolean; message: string }> {
    const channel = await this.getChannel(id);
    channel.lastTestedAt = new Date();
    // Simulate test
    const success = Math.random() > 0.2;
    channel.lastTestStatus = success ? 'success' : 'failed';
    await this.channelRepo.save(channel);
    return {
      success,
      message: success ? 'Test notification sent successfully' : 'Failed to send test notification',
    };
  }

  // =================== Logs ===================

  async getLogs(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: NotificationLog[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20, type, status, search } = params;
    const query = this.logRepo.createQueryBuilder('log');

    if (type) {
      query.andWhere('log.type = :type', { type });
    }
    if (status) {
      query.andWhere('log.status = :status', { status });
    }
    if (search) {
      query.andWhere('(log.recipient ILIKE :search OR log.subject ILIKE :search)', { search: `%${search}%` });
    }

    query.orderBy('log.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLog(id: string): Promise<NotificationLog> {
    const log = await this.logRepo.findOne({
      where: { id },
      relations: ['template'],
    });
    if (!log) {
      throw new NotFoundException('Log not found');
    }
    return log;
  }

  async resendNotification(id: string): Promise<NotificationLog> {
    const log = await this.getLog(id);
    // Create a new log entry for the resend
    const newLog = this.logRepo.create({
      type: log.type,
      recipient: log.recipient,
      subject: log.subject,
      templateId: log.templateId,
      templateName: log.templateName,
      metadata: { ...log.metadata, resendOf: log.id },
      status: NotificationStatus.PENDING,
    });
    const savedLog = await this.logRepo.save(newLog);
    // Simulate sending
    setTimeout(async () => {
      savedLog.status = Math.random() > 0.1 ? NotificationStatus.SENT : NotificationStatus.FAILED;
      if (savedLog.status === NotificationStatus.SENT) {
        savedLog.deliveredAt = new Date();
      } else {
        savedLog.errorMessage = 'Simulated failure';
      }
      await this.logRepo.save(savedLog);
    }, 1000);
    return savedLog;
  }

  async getStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, sent, failed, pending, todayTotal] = await Promise.all([
      this.logRepo.count(),
      this.logRepo.count({ where: { status: NotificationStatus.SENT } }),
      this.logRepo.count({ where: { status: NotificationStatus.FAILED } }),
      this.logRepo.count({ where: { status: NotificationStatus.PENDING } }),
      this.logRepo.createQueryBuilder('log')
        .where('log.createdAt >= :today', { today })
        .getCount(),
    ]);

    const opened = await this.logRepo.count({ where: { status: NotificationStatus.OPENED } });
    const delivered = await this.logRepo.count({ where: { status: NotificationStatus.DELIVERED } });

    return {
      total,
      sent,
      failed,
      pending,
      todayTotal,
      delivered,
      opened,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    };
  }

  async sendBroadcast(data: { subject: string; content: string; type: string }): Promise<any> {
    // Simulate broadcast - in real implementation this would queue notifications
    const log = this.logRepo.create({
      type: data.type,
      recipient: 'broadcast@system',
      subject: data.subject,
      status: NotificationStatus.PENDING,
      metadata: { isBroadcast: true, content: data.content },
    });
    return this.logRepo.save(log);
  }

  // =================== Default Data Seeding ===================

  private async seedDefaultTemplates() {
    const count = await this.templateRepo.count();
    if (count > 0) return;

    const templates = this.getDefaultTemplates();
    for (const template of templates) {
      await this.templateRepo.save(this.templateRepo.create(template));
    }
  }

  private async seedDefaultChannels() {
    const count = await this.channelRepo.count();
    if (count > 0) return;

    const channels = this.getDefaultChannels();
    for (const channel of channels) {
      await this.channelRepo.save(this.channelRepo.create(channel));
    }
  }

  private getDefaultTemplates(): Partial<NotificationTemplate>[] {
    return [
      // ===== 用户账户类 (Account) =====
      {
        name: '欢迎邮件',
        code: 'welcome',
        type: 'email' as any,
        category: 'account',
        subject: '欢迎加入 {{appName}}！',
        content: '亲爱的 {{userName}}，\n\n欢迎加入 {{appName}}！我们很高兴您选择我们的服务。\n\n开始使用：\n1. 创建您的第一个短链接\n2. 设置自定义域名\n3. 探索分析功能\n\n如有任何问题，请随时联系我们的支持团队。\n\n祝您使用愉快！\n{{appName}} 团队',
        htmlContent: '<h1>欢迎加入 {{appName}}！</h1><p>亲爱的 {{userName}}，</p><p>欢迎加入 {{appName}}！我们很高兴您选择我们的服务。</p>',
        variables: ['userName', 'appName', 'loginUrl'],
        description: '用户注册成功后发送的欢迎邮件',
        isSystem: true,
        isActive: true,
      },
      {
        name: '邮箱验证',
        code: 'email_verification',
        type: 'email' as any,
        category: 'account',
        subject: '请验证您的邮箱地址',
        content: '亲爱的 {{userName}}，\n\n请点击以下链接验证您的邮箱地址：\n{{verificationLink}}\n\n此链接将在 {{expiryHours}} 小时后失效。\n\n如果您没有注册账户，请忽略此邮件。\n\n{{appName}} 团队',
        variables: ['userName', 'verificationLink', 'expiryHours', 'appName'],
        description: '用户邮箱验证邮件',
        isSystem: true,
        isActive: true,
      },
      {
        name: '密码重置',
        code: 'password_reset',
        type: 'email' as any,
        category: 'account',
        subject: '重置您的密码',
        content: '亲爱的 {{userName}}，\n\n我们收到了您的密码重置请求。请点击以下链接重置密码：\n{{resetLink}}\n\n此链接将在 {{expiryMinutes}} 分钟后失效。\n\n如果您没有请求重置密码，请忽略此邮件并确保您的账户安全。\n\n{{appName}} 团队',
        variables: ['userName', 'resetLink', 'expiryMinutes', 'appName'],
        description: '用户忘记密码时发送的重置链接',
        isSystem: true,
        isActive: true,
      },
      {
        name: '密码修改成功',
        code: 'password_changed',
        type: 'email' as any,
        category: 'account',
        subject: '您的密码已成功修改',
        content: '亲爱的 {{userName}}，\n\n您的密码已于 {{changedAt}} 成功修改。\n\n如果这不是您本人的操作，请立即联系我们的支持团队。\n\nIP地址：{{ipAddress}}\n设备：{{deviceInfo}}\n\n{{appName}} 团队',
        variables: ['userName', 'changedAt', 'ipAddress', 'deviceInfo', 'appName'],
        description: '密码修改成功通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '账户登录通知',
        code: 'login_notification',
        type: 'email' as any,
        category: 'account',
        subject: '检测到新设备登录',
        content: '亲爱的 {{userName}}，\n\n我们检测到您的账户在新设备上登录：\n\n时间：{{loginTime}}\n设备：{{deviceInfo}}\n位置：{{location}}\nIP地址：{{ipAddress}}\n\n如果这不是您本人的操作，请立即修改密码。\n\n{{appName}} 团队',
        variables: ['userName', 'loginTime', 'deviceInfo', 'location', 'ipAddress', 'appName'],
        description: '新设备登录安全提醒',
        isSystem: true,
        isActive: true,
      },
      {
        name: '两步验证已启用',
        code: '2fa_enabled',
        type: 'email' as any,
        category: 'account',
        subject: '两步验证已成功启用',
        content: '亲爱的 {{userName}}，\n\n您的账户已成功启用两步验证。这将为您的账户提供额外的安全保护。\n\n请妥善保管您的备用验证码，以防无法使用验证器应用。\n\n{{appName}} 团队',
        variables: ['userName', 'appName'],
        description: '两步验证启用成功通知',
        isSystem: true,
        isActive: true,
      },

      // ===== 团队协作类 (Team) =====
      {
        name: '团队邀请',
        code: 'team_invitation',
        type: 'email' as any,
        category: 'team',
        subject: '您被邀请加入 {{teamName}} 团队',
        content: '您好，\n\n{{inviterName}} 邀请您加入 {{teamName}} 团队。\n\n角色：{{role}}\n\n请点击以下链接接受邀请：\n{{invitationLink}}\n\n此邀请将在 {{expiryDays}} 天后失效。\n\n{{appName}} 团队',
        variables: ['inviterName', 'teamName', 'role', 'invitationLink', 'expiryDays', 'appName'],
        description: '团队成员邀请邮件',
        isSystem: true,
        isActive: true,
      },
      {
        name: '团队成员加入',
        code: 'team_member_joined',
        type: 'email' as any,
        category: 'team',
        subject: '{{memberName}} 已加入团队',
        content: '您好 {{teamOwner}}，\n\n{{memberName}} 已接受邀请并加入了 {{teamName}} 团队。\n\n角色：{{role}}\n加入时间：{{joinedAt}}\n\n{{appName}} 团队',
        variables: ['teamOwner', 'memberName', 'teamName', 'role', 'joinedAt', 'appName'],
        description: '新成员加入团队通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '团队角色变更',
        code: 'team_role_changed',
        type: 'email' as any,
        category: 'team',
        subject: '您在 {{teamName}} 的角色已变更',
        content: '您好 {{userName}}，\n\n您在 {{teamName}} 团队的角色已从 {{oldRole}} 变更为 {{newRole}}。\n\n操作者：{{changedBy}}\n变更时间：{{changedAt}}\n\n{{appName}} 团队',
        variables: ['userName', 'teamName', 'oldRole', 'newRole', 'changedBy', 'changedAt', 'appName'],
        description: '团队成员角色变更通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '团队成员移除',
        code: 'team_member_removed',
        type: 'email' as any,
        category: 'team',
        subject: '您已被移出 {{teamName}} 团队',
        content: '您好 {{userName}}，\n\n您已被移出 {{teamName}} 团队。\n\n操作者：{{removedBy}}\n移除时间：{{removedAt}}\n\n如有疑问，请联系团队管理员。\n\n{{appName}} 团队',
        variables: ['userName', 'teamName', 'removedBy', 'removedAt', 'appName'],
        description: '成员被移出团队通知',
        isSystem: true,
        isActive: true,
      },

      // ===== 链接相关类 (Link) =====
      {
        name: '链接创建成功',
        code: 'link_created',
        type: 'email' as any,
        category: 'link',
        subject: '您的短链接已创建成功',
        content: '您好 {{userName}}，\n\n您的短链接已创建成功！\n\n短链接：{{shortUrl}}\n原始链接：{{originalUrl}}\n\n您可以在控制台查看链接的详细分析数据。\n\n{{appName}} 团队',
        variables: ['userName', 'shortUrl', 'originalUrl', 'appName'],
        description: '链接创建成功通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '链接点击里程碑',
        code: 'link_milestone',
        type: 'email' as any,
        category: 'link',
        subject: '恭喜！您的链接达到 {{milestone}} 次点击',
        content: '您好 {{userName}}，\n\n恭喜！您的短链接已达到 {{milestone}} 次点击！\n\n链接：{{shortUrl}}\n总点击数：{{totalClicks}}\n\n继续加油！查看详细分析数据了解更多。\n\n{{appName}} 团队',
        variables: ['userName', 'shortUrl', 'milestone', 'totalClicks', 'appName'],
        description: '链接点击量达到里程碑时的通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '链接即将过期',
        code: 'link_expiring',
        type: 'email' as any,
        category: 'link',
        subject: '您的短链接即将过期',
        content: '您好 {{userName}}，\n\n您的以下短链接将于 {{expiryDate}} 过期：\n\n{{shortUrl}}\n\n如需延长有效期，请登录控制台进行设置。\n\n{{appName}} 团队',
        variables: ['userName', 'shortUrl', 'expiryDate', 'appName'],
        description: '链接即将过期提醒',
        isSystem: true,
        isActive: true,
      },

      // ===== 域名相关类 (Domain) =====
      {
        name: '域名验证成功',
        code: 'domain_verified',
        type: 'email' as any,
        category: 'domain',
        subject: '您的域名 {{domain}} 验证成功',
        content: '您好 {{userName}}，\n\n恭喜！您的自定义域名 {{domain}} 已验证成功。\n\n您现在可以使用此域名创建短链接了。\n\nSSL证书状态：{{sslStatus}}\n\n{{appName}} 团队',
        variables: ['userName', 'domain', 'sslStatus', 'appName'],
        description: '域名验证成功通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '域名验证失败',
        code: 'domain_verification_failed',
        type: 'email' as any,
        category: 'domain',
        subject: '域名 {{domain}} 验证失败',
        content: '您好 {{userName}}，\n\n您的域名 {{domain}} 验证失败。\n\n失败原因：{{errorMessage}}\n\n请检查您的DNS设置并重试。如需帮助，请查看我们的文档或联系支持团队。\n\n{{appName}} 团队',
        variables: ['userName', 'domain', 'errorMessage', 'appName'],
        description: '域名验证失败通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: 'SSL证书即将过期',
        code: 'ssl_expiring',
        type: 'email' as any,
        category: 'domain',
        subject: '域名 {{domain}} 的SSL证书即将过期',
        content: '您好 {{userName}}，\n\n您的域名 {{domain}} 的SSL证书将于 {{expiryDate}} 过期。\n\n系统将自动尝试续期。如果自动续期失败，我们会及时通知您。\n\n{{appName}} 团队',
        variables: ['userName', 'domain', 'expiryDate', 'appName'],
        description: 'SSL证书即将过期提醒',
        isSystem: true,
        isActive: true,
      },

      // ===== 账单支付类 (Billing) =====
      {
        name: '订阅成功',
        code: 'subscription_created',
        type: 'email' as any,
        category: 'billing',
        subject: '订阅成功 - {{planName}} 计划',
        content: '您好 {{userName}}，\n\n感谢您订阅 {{planName}} 计划！\n\n订阅详情：\n计划：{{planName}}\n价格：{{price}}/{{billingCycle}}\n下次扣款日期：{{nextBillingDate}}\n\n享受您的高级功能吧！\n\n{{appName}} 团队',
        variables: ['userName', 'planName', 'price', 'billingCycle', 'nextBillingDate', 'appName'],
        description: '订阅成功通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '付款成功',
        code: 'payment_success',
        type: 'email' as any,
        category: 'billing',
        subject: '付款成功 - {{amount}}',
        content: '您好 {{userName}}，\n\n您的付款已成功处理。\n\n付款详情：\n金额：{{amount}}\n日期：{{paymentDate}}\n发票编号：{{invoiceId}}\n支付方式：{{paymentMethod}}\n\n感谢您的支持！\n\n{{appName}} 团队',
        variables: ['userName', 'amount', 'paymentDate', 'invoiceId', 'paymentMethod', 'appName'],
        description: '付款成功通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '付款失败',
        code: 'payment_failed',
        type: 'email' as any,
        category: 'billing',
        subject: '付款失败 - 请更新支付方式',
        content: '您好 {{userName}}，\n\n很遗憾，您的最近一次付款失败了。\n\n金额：{{amount}}\n失败原因：{{failureReason}}\n\n请登录账户更新您的支付方式，以避免服务中断。\n\n{{appName}} 团队',
        variables: ['userName', 'amount', 'failureReason', 'appName'],
        description: '付款失败通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '订阅即将过期',
        code: 'subscription_expiring',
        type: 'email' as any,
        category: 'billing',
        subject: '您的 {{planName}} 订阅即将过期',
        content: '您好 {{userName}}，\n\n您的 {{planName}} 订阅将于 {{expiryDate}} 过期。\n\n续订以继续享受以下功能：\n{{features}}\n\n续订链接：{{renewUrl}}\n\n{{appName}} 团队',
        variables: ['userName', 'planName', 'expiryDate', 'features', 'renewUrl', 'appName'],
        description: '订阅即将过期提醒',
        isSystem: true,
        isActive: true,
      },
      {
        name: '配额使用警告',
        code: 'quota_warning',
        type: 'email' as any,
        category: 'billing',
        subject: '配额使用警告 - 已使用 {{usagePercent}}%',
        content: '您好 {{userName}}，\n\n您的 {{quotaType}} 配额已使用 {{usagePercent}}%。\n\n已使用：{{used}}\n总配额：{{total}}\n\n升级您的计划以获得更多配额。\n\n{{appName}} 团队',
        variables: ['userName', 'quotaType', 'usagePercent', 'used', 'total', 'appName'],
        description: '配额使用达到阈值时的警告',
        isSystem: true,
        isActive: true,
      },

      // ===== 系统通知类 (System) =====
      {
        name: '系统维护通知',
        code: 'system_maintenance',
        type: 'email' as any,
        category: 'system',
        subject: '系统维护通知 - {{maintenanceDate}}',
        content: '尊敬的用户，\n\n我们将于 {{maintenanceDate}} 进行系统维护。\n\n维护时间：{{startTime}} - {{endTime}}\n影响范围：{{affectedServices}}\n\n维护期间部分服务可能暂时不可用。我们会尽快完成维护工作。\n\n如有问题，请联系支持团队。\n\n{{appName}} 团队',
        variables: ['maintenanceDate', 'startTime', 'endTime', 'affectedServices', 'appName'],
        description: '系统维护公告',
        isSystem: true,
        isActive: true,
      },
      {
        name: 'API密钥创建',
        code: 'api_key_created',
        type: 'email' as any,
        category: 'system',
        subject: '新的API密钥已创建',
        content: '您好 {{userName}}，\n\n您已成功创建新的API密钥。\n\n密钥名称：{{keyName}}\n创建时间：{{createdAt}}\n权限：{{permissions}}\n\n请妥善保管您的API密钥，不要分享给他人。\n\n{{appName}} 团队',
        variables: ['userName', 'keyName', 'createdAt', 'permissions', 'appName'],
        description: 'API密钥创建通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: 'Webhook配置更新',
        code: 'webhook_updated',
        type: 'email' as any,
        category: 'system',
        subject: 'Webhook配置已更新',
        content: '您好 {{userName}}，\n\nWebhook配置已更新。\n\nWebhook URL：{{webhookUrl}}\n事件类型：{{eventTypes}}\n更新时间：{{updatedAt}}\n\n{{appName}} 团队',
        variables: ['userName', 'webhookUrl', 'eventTypes', 'updatedAt', 'appName'],
        description: 'Webhook配置更新通知',
        isSystem: true,
        isActive: true,
      },

      // ===== 短信模板 (SMS) =====
      {
        name: '短信验证码',
        code: 'sms_verification_code',
        type: 'sms' as any,
        category: 'account',
        content: '【{{appName}}】您的验证码是 {{code}}，{{expiryMinutes}}分钟内有效。请勿泄露给他人。',
        variables: ['appName', 'code', 'expiryMinutes'],
        description: '短信验证码',
        isSystem: true,
        isActive: true,
      },
      {
        name: '登录验证码',
        code: 'sms_login_code',
        type: 'sms' as any,
        category: 'account',
        content: '【{{appName}}】您正在登录，验证码 {{code}}，{{expiryMinutes}}分钟内有效。如非本人操作，请忽略。',
        variables: ['appName', 'code', 'expiryMinutes'],
        description: '登录验证码短信',
        isSystem: true,
        isActive: true,
      },

      // ===== 推送通知 (Push) =====
      {
        name: '链接点击推送',
        code: 'push_link_click',
        type: 'push' as any,
        category: 'link',
        subject: '您的链接有新点击',
        content: '您的链接 {{shortUrl}} 刚刚被点击，来自 {{location}}。',
        variables: ['shortUrl', 'location'],
        description: '链接点击实时推送通知',
        isSystem: true,
        isActive: true,
      },
      {
        name: '每日汇总推送',
        code: 'push_daily_summary',
        type: 'push' as any,
        category: 'link',
        subject: '今日数据汇总',
        content: '今日总点击：{{totalClicks}}，新建链接：{{newLinks}}，活跃链接：{{activeLinks}}',
        variables: ['totalClicks', 'newLinks', 'activeLinks'],
        description: '每日数据汇总推送',
        isSystem: true,
        isActive: true,
      },
    ];
  }

  private getDefaultChannels(): Partial<NotificationChannel>[] {
    // 注意：邮件SMTP配置在系统设置中管理，这里只管理额外的通知渠道
    return [
      {
        name: '短信 (阿里云)',
        type: 'sms' as any,
        config: {
          provider: 'aliyun',
          accessKeyId: '',
          accessKeySecret: '',
          signName: 'lnk.day',
        },
        enabled: false,
        isDefault: false,
      },
      {
        name: 'Slack 通知',
        type: 'slack' as any,
        config: {
          webhookUrl: '',
          channel: '#notifications',
        },
        enabled: false,
        isDefault: false,
      },
      {
        name: 'Webhook 回调',
        type: 'webhook' as any,
        config: {
          url: '',
          headers: {},
          method: 'POST',
        },
        enabled: false,
        isDefault: false,
      },
    ];
  }

  // =================== Events ===================

  getAvailableEvents() {
    return [
      { event: 'link.created', name: '链接创建', description: '当创建新链接时触发' },
      { event: 'link.clicked', name: '链接点击', description: '当链接被点击时触发' },
      { event: 'link.updated', name: '链接更新', description: '当链接被修改时触发' },
      { event: 'link.deleted', name: '链接删除', description: '当链接被删除时触发' },
      { event: 'link.expired', name: '链接过期', description: '当链接过期时触发' },
      { event: 'qr.created', name: 'QR 码创建', description: '当创建新 QR 码时触发' },
      { event: 'qr.scanned', name: 'QR 码扫描', description: '当 QR 码被扫描时触发' },
      { event: 'campaign.started', name: '活动开始', description: '当营销活动开始时触发' },
      { event: 'campaign.ended', name: '活动结束', description: '当营销活动结束时触发' },
      { event: 'campaign.goal_reached', name: '活动目标达成', description: '当活动达成目标时触发' },
      { event: 'team.member_invited', name: '成员邀请', description: '当邀请新成员时触发' },
      { event: 'team.member_joined', name: '成员加入', description: '当成员接受邀请时触发' },
      { event: 'team.member_removed', name: '成员移除', description: '当成员被移除时触发' },
      { event: 'domain.verified', name: '域名验证', description: '当域名验证成功时触发' },
      { event: 'domain.ssl_issued', name: 'SSL 证书签发', description: '当 SSL 证书签发时触发' },
      { event: 'billing.payment_success', name: '支付成功', description: '当支付成功时触发' },
      { event: 'billing.payment_failed', name: '支付失败', description: '当支付失败时触发' },
      { event: 'billing.subscription_renewed', name: '订阅续费', description: '当订阅自动续费时触发' },
      { event: 'security.password_changed', name: '密码修改', description: '当密码被修改时触发' },
      { event: 'security.2fa_enabled', name: '两步验证启用', description: '当启用两步验证时触发' },
    ];
  }
}
