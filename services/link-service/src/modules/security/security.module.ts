import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { UrlScanResult } from './entities/url-scan-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UrlScanResult])],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
