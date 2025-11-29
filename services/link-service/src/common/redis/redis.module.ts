import { Module, Global } from '@nestjs/common';
import { CacheModule as SharedCacheModule, REDIS_CLIENT as SHARED_REDIS_CLIENT } from '@lnk/nestjs-common';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';

export { REDIS_CLIENT };

@Global()
@Module({
  imports: [SharedCacheModule.forRoot()],
  providers: [
    // Re-export shared REDIS_CLIENT as local REDIS_CLIENT for backward compatibility
    {
      provide: REDIS_CLIENT,
      useExisting: SHARED_REDIS_CLIENT,
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService, SharedCacheModule],
})
export class RedisModule {}
