import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { OpenApiController } from './openapi.controller';
import { OpenApiService } from './openapi.service';
import { OpenApiGuard, OpenApiScopesGuard } from './openapi.guard';

@Module({
  imports: [ConfigModule],
  controllers: [OpenApiController],
  providers: [OpenApiService, OpenApiGuard, OpenApiScopesGuard],
  exports: [OpenApiService, OpenApiGuard, OpenApiScopesGuard],
})
export class OpenApiModule {}
