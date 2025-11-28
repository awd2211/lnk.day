import { Module } from '@nestjs/common';

import { RateLimitController } from './ratelimit.controller';
import { RateLimitService } from './ratelimit.service';

@Module({
  controllers: [RateLimitController],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
