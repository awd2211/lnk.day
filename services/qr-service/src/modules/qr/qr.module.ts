import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { QrLimitService } from './qr-limit.service';
import { QrLimit } from './entities/qr-limit.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([QrLimit]), AuthModule],
  controllers: [QrController],
  providers: [QrService, QrLimitService],
  exports: [QrService, QrLimitService],
})
export class QrModule {}
