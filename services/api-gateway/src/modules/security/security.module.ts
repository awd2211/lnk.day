import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { IpWhitelistService } from './ip-whitelist.service';
import { IpWhitelistController } from './ip-whitelist.controller';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';

@Module({
  controllers: [IpWhitelistController],
  providers: [
    IpWhitelistService,
    // Register as global guard (optional - can be applied per-route instead)
    // {
    //   provide: APP_GUARD,
    //   useClass: IpWhitelistGuard,
    // },
  ],
  exports: [IpWhitelistService],
})
export class SecurityModule {}
