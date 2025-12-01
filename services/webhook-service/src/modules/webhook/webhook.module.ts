import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WebhookController, WebhookInternalController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { Webhook } from './entities/webhook.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook]),
    ConfigModule,
  ],
  controllers: [WebhookController, WebhookInternalController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
