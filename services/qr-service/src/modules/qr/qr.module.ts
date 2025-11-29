import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { QrLimitService } from './qr-limit.service';
import { QrLimit } from './entities/qr-limit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QrLimit])],
  controllers: [QrController],
  providers: [QrService, QrLimitService],
  exports: [QrService, QrLimitService],
})
export class QrModule {}
