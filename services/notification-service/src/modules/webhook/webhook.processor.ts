import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import axios from 'axios';

interface WebhookJob {
  webhookId: string;
  url: string;
  payload: object;
  signature: string;
}

@Processor('webhook')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  @Process('deliver')
  async handleDeliver(job: Job<WebhookJob>): Promise<void> {
    const { webhookId, url, payload, signature } = job.data;
    this.logger.log(`Delivering webhook ${webhookId} to ${url}`);

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': webhookId,
          'User-Agent': 'lnk.day-webhook/1.0',
        },
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      this.logger.log(`Webhook ${webhookId} delivered successfully: ${response.status}`);
    } catch (error) {
      this.logger.error(`Webhook ${webhookId} delivery failed: ${error.message}`);
      throw error;
    }
  }
}
