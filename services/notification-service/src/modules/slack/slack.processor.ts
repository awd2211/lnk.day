import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { SlackMessage } from './slack.service';

@Processor('slack')
export class SlackProcessor {
  private readonly logger = new Logger(SlackProcessor.name);
  private readonly botToken: string = '';

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('SLACK_BOT_TOKEN') || '';
  }

  @Process('send')
  async handleSend(job: Job<SlackMessage>) {
    const message = job.data;
    this.logger.debug(`Processing Slack message to channel: ${message.channel}`);

    try {
      if (message.webhookUrl) {
        // Send via webhook
        const response = await fetch(message.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message.text,
            blocks: message.blocks,
            attachments: message.attachments,
          }),
        });

        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.statusText}`);
        }
      } else if (this.botToken) {
        // Send via Bot API
        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.botToken}`,
          },
          body: JSON.stringify({
            channel: message.channel,
            text: message.text,
            blocks: message.blocks,
            attachments: message.attachments,
          }),
        });

        const result = await response.json() as any;
        if (!result.ok) {
          throw new Error(`Slack API error: ${result.error}`);
        }
      } else {
        throw new Error('No Slack credentials configured');
      }

      this.logger.log(`Slack message sent successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to send Slack message: ${error.message}`);
      throw error;
    }
  }
}
