import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TeamsMessage } from './teams.service';

@Processor('teams')
export class TeamsProcessor {
  private readonly logger = new Logger(TeamsProcessor.name);

  @Process('send')
  async handleSend(job: Job<TeamsMessage>) {
    const { webhookUrl, card } = job.data;
    this.logger.debug(`Processing Teams message: ${card.summary}`);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        throw new Error(`Teams webhook failed: ${response.statusText}`);
      }

      this.logger.log(`Teams message sent successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to send Teams message: ${error.message}`);
      throw error;
    }
  }
}
