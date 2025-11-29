import { Module } from '@nestjs/common';
import { GS1Controller } from './gs1.controller';
import { GS1Service } from './gs1.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GS1Controller],
  providers: [GS1Service],
  exports: [GS1Service],
})
export class GS1Module {}
