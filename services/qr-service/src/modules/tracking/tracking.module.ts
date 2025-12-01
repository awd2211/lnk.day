import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrRecord, QrScan } from './qr-record.entity';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { TrackingInternalController } from './tracking-internal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QrRecord, QrScan])],
  controllers: [TrackingController, TrackingInternalController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
