import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeepLinkController } from './deeplink.controller';
import { DeepLinkService } from './deeplink.service';
import { DeepLink } from './entities/deeplink.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeepLink]), AuthModule],
  controllers: [DeepLinkController],
  providers: [DeepLinkService],
})
export class DeepLinkModule {}
