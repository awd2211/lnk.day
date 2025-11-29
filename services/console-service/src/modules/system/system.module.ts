import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SystemController, SystemInternalController } from './system.controller';
import { SystemService } from './system.service';
import { SystemConfigService } from './config.service';
import { SystemConfig } from './entities/system-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemConfig]),
    HttpModule,
  ],
  controllers: [SystemController, SystemInternalController],
  providers: [SystemService, SystemConfigService],
  exports: [SystemService, SystemConfigService],
})
export class SystemModule {}
