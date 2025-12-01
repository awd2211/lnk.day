import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DomainController, DomainInternalController } from './domain.controller';
import { DomainService } from './domain.service';
import { CustomDomain } from './entities/custom-domain.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomDomain])],
  controllers: [DomainController, DomainInternalController],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
