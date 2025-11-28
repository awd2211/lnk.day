import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SalesforceConnection } from './entities/salesforce-connection.entity';
import { SalesforceService } from './salesforce.service';
import { SalesforceController } from './salesforce.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SalesforceConnection])],
  controllers: [SalesforceController],
  providers: [SalesforceService],
  exports: [SalesforceService],
})
export class SalesforceModule {}
