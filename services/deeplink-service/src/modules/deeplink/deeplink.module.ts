import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeepLinkController } from './deeplink.controller';
import { DeepLinkService } from './deeplink.service';
import { DeepLink } from './entities/deeplink.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeepLink])],
  controllers: [DeepLinkController],
  providers: [DeepLinkService],
})
export class DeepLinkModule {}
