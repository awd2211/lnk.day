import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';
import { CustomDomain } from './entities/custom-domain.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomDomain])],
  controllers: [DomainController],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
