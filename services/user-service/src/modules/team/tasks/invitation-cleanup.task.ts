import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvitationService } from '../invitation.service';

@Injectable()
export class InvitationCleanupTask {
  private readonly logger = new Logger(InvitationCleanupTask.name);

  constructor(private readonly invitationService: InvitationService) {}

  // 每天凌晨 2 点清理过期邀请
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
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
