import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailConfigService } from './email-config.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    HttpModule,
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor, EmailConfigService],
  exports: [EmailService, EmailConfigService],
})
export class EmailModule {}
