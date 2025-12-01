import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeepLinkController } from './deeplink.controller';
import { DeepLinkInternalController } from './deeplink-internal.controller';
import { DeepLinkService } from './deeplink.service';
import { DeepLink } from './entities/deeplink.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeepLink])],
  controllers: [DeepLinkController, DeepLinkInternalController],
  providers: [DeepLinkService],
})
export class DeepLinkModule {}
