import type { HttpClient } from '../../utils/http';
import type {
  Webhook,
  CreateWebhookParams,
  UpdateWebhookParams,
  WebhookEvent,
  PaginationParams,
  PaginatedResponse,
} from '../../types';

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
  responseStatus?: number;
  responseBody?: string;
  deliveredAt?: string;
  duration?: number;
  success: boolean;
  error?: string;
  retryCount: number;
  createdAt: string;
}

export class WebhooksModule {
  constructor(private http: HttpClient) {}

  async create(params: CreateWebhookParams): Promise<Webhook> {
    return this.http.post<Webhook>('/webhooks', params);
  }

  async get(webhookId: string): Promise<Webhook> {
    return this.http.get<Webhook>(`/webhooks/${webhookId}`);
  }

  async update(webhookId: string, params: UpdateWebhookParams): Promise<Webhook> {
    return this.http.patch<Webhook>(`/webhooks/${webhookId}`, params);
  }

  async delete(webhookId: string): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  async list(pagination?: PaginationParams): Promise<PaginatedResponse<Webhook>> {
    return this.http.get<PaginatedResponse<Webhook>>('/webhooks', pagination);
  }

  async enable(webhookId: string): Promise<Webhook> {
    return this.http.post<Webhook>(`/webhooks/${webhookId}/enable`);
  }

  async disable(webhookId: string): Promise<Webhook> {
    return this.http.post<Webhook>(`/webhooks/${webhookId}/disable`);
  }

  async rotateSecret(webhookId: string): Promise<{ secret: string }> {
    return this.http.post(`/webhooks/${webhookId}/rotate-secret`);
  }

  async test(webhookId: string, event?: WebhookEvent): Promise<{
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
  }> {
    return this.http.post(`/webhooks/${webhookId}/test`, { event });
  }

  async getDeliveries(
    webhookId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<WebhookDelivery>> {
    return this.http.get(`/webhooks/${webhookId}/deliveries`, pagination);
  }

  async getDelivery(webhookId: string, deliveryId: string): Promise<WebhookDelivery> {
    return this.http.get(`/webhooks/${webhookId}/deliveries/${deliveryId}`);
  }

  async retryDelivery(webhookId: string, deliveryId: string): Promise<WebhookDelivery> {
    return this.http.post(`/webhooks/${webhookId}/deliveries/${deliveryId}/retry`);
  }

  async getAvailableEvents(): Promise<Array<{
    event: WebhookEvent;
    description: string;
    payloadExample: Record<string, any>;
  }>> {
    return this.http.get('/webhooks/events');
  }

  verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return `sha256=${expectedSignature}` === signature;
  }
}
