import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SSOController } from './sso.controller';
import { SSOService } from './sso.service';
import { SSOConfig, SSOSession } from './entities/sso-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SSOConfig, SSOSession])],
  controllers: [SSOController],
  providers: [SSOService],
  exports: [SSOService],
})
export class SSOModule {}
