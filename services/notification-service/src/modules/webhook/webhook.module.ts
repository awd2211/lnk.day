import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { WebhookService } from './webhook.service';
import { WebhookProcessor } from './webhook.processor';
import { WebhookEndpointService } from './webhook-endpoint.service';
import { WebhookController } from './webhook.controller';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery]),
    BullModule.registerQueue({
      name: 'webhook',
    }),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookProcessor, WebhookEndpointService],
  exports: [WebhookService, WebhookEndpointService],
})
export class WebhookModule {}
