import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InvitationService } from '../invitation.service';

const EVERY_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationCleanupTask implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvitationCleanupTask.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly invitationService: InvitationService) {}

  onModuleInit() {
    this.cleanupInterval = setInterval(() => {
      this.handleCleanup().catch((err) => {
        this.logger.error(`邀请清理任务失败: ${err.message}`);
      });
    }, EVERY_DAY);
    this.logger.log('邀请清理定时任务已启动 (每天)');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log('邀请清理定时任务已停止');
    }
  }

  // 每天凌晨 2 点清理过期邀请
  async handleCleanup() {
    this.logger.log('Starting invitation cleanup task...');
    try {
      const count = await this.invitationService.cleanupExpiredInvitations();
      this.logger.log(`Invitation cleanup completed. Marked ${count} invitations as expired.`);
    } catch (error: any) {
      this.logger.error(`Invitation cleanup failed: ${error.message}`);
    }
  }
}
