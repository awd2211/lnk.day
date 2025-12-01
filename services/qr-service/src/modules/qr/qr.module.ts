import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrController } from './qr.controller';
import { DynamicQrController } from './dynamic-qr.controller';
import { QrService } from './qr.service';
import { QrLimitService } from './qr-limit.service';
import { DynamicQrService } from './dynamic-qr.service';
import { QrLimit } from './entities/qr-limit.entity';
import { DynamicQrCode } from './entities/dynamic-qr.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QrLimit, DynamicQrCode])],
  controllers: [QrController, DynamicQrController],
  providers: [QrService, QrLimitService, DynamicQrService],
  exports: [QrService, QrLimitService, DynamicQrService],
})
export class QrModule {}
