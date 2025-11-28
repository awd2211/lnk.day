import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { UrlScanResult } from './entities/url-scan-result.entity';
import { Link } from '../link/entities/link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UrlScanResult, Link])],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
