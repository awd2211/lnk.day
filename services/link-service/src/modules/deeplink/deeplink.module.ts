import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeepLinkConfig, DeferredDeepLink } from './deeplink.entity';
import { DeepLinkService } from './deeplink.service';
import {
  DeepLinkController,
  WellKnownController,
  DeferredDeepLinkController,
} from './deeplink.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeepLinkConfig, DeferredDeepLink])],
  controllers: [DeepLinkController, WellKnownController, DeferredDeepLinkController],
  providers: [DeepLinkService],
  exports: [DeepLinkService],
})
export class DeepLinkModule {}
