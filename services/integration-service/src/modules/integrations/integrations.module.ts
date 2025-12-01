import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { HubSpotConnection } from '../hubspot/entities/hubspot-connection.entity';
import { SalesforceConnection } from '../salesforce/entities/salesforce-connection.entity';
import { ShopifyConnection } from '../shopify/entities/shopify-connection.entity';
import { ZapierSubscription } from '../zapier/entities/zapier-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HubSpotConnection,
      SalesforceConnection,
      ShopifyConnection,
      ZapierSubscription,
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
