import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HubSpotConnection } from './entities/hubspot-connection.entity';
import { HubSpotService } from './hubspot.service';
import { HubSpotController } from './hubspot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HubSpotConnection])],
  controllers: [HubSpotController],
  providers: [HubSpotService],
  exports: [HubSpotService],
})
export class HubSpotModule {}
