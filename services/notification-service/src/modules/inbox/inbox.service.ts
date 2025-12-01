import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserNotification, NotificationType } from './entities/user-notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

export interface CreateNotificationDto {
  userId: string;
  teamId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
  category?: string;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: string;
}

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(UserNotification)
    private readonly notificationRepo: Repository<UserNotification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<UserNotification> {
    const notification = this.notificationRepo.create({
      ...dto,
      type: dto.type || 'info',
      read: false,
    });
    return this.notificationRepo.save(notification);
  }

  async getNotifications(
    userId: string,
    params: NotificationQueryParams = {},
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const { read, type } = params;
    const skip = (page - 1) * limit;

    const query = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (read !== undefined) {
      query.andWhere('n.read = :read', { read });
    }

    if (type) {
      query.andWhere('n.type = :type', { type });
    }

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNotification(id: string, userId: string): Promise<UserNotification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<UserNotification> {
    const notification = await this.getNotification(id, userId);
    notification.read = true;
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationRepo.update(
      { userId, read: false },
      { read: true },
    );
    return { affected: result.affected || 0 };
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    const notification = await this.getNotification(id, userId);
    await this.notificationRepo.remove(notification);
  }

  async deleteMultiple(ids: string[], userId: string): Promise<{ deleted: number }> {
    const result = await this.notificationRepo.delete({
      id: In(ids),
      userId,
    });
    return { deleted: result.affected || 0 };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.preferenceRepo.findOne({
      where: { userId },
    });

    if (!prefs) {
      prefs = this.preferenceRepo.create({
        userId,
        email: {
          enabled: true,
          linkCreated: true,
          milestone: true,
          weeklyReport: true,
          securityAlerts: true,
        },
        push: {
          enabled: true,
          linkCreated: true,
          milestone: true,
          weeklyReport: false,
          securityAlerts: true,
        },
        inApp: {
          enabled: true,
          linkCreated: true,
          milestone: true,
          weeklyReport: true,
          securityAlerts: true,
        },
      });
      prefs = await this.preferenceRepo.save(prefs);
    }

    return prefs;
  }

  async updatePreferences(
    userId: string,
    data: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    let prefs = await this.preferenceRepo.findOne({
      where: { userId },
    });

    if (!prefs) {
      prefs = this.preferenceRepo.create({ userId });
    }

    Object.assign(prefs, data);
    return this.preferenceRepo.save(prefs);
  }

  async clearOldNotifications(userId: string, daysOld: number = 30): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .andWhere('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('read = true')
      .execute();

    return { deleted: result.affected || 0 };
  }
}
