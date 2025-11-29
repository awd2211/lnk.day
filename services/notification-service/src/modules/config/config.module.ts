import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigController } from './config.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => EmailModule),
  ],
  controllers: [ConfigController],
})
export class NotificationConfigModule {}
