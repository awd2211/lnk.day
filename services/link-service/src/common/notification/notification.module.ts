import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NotificationClientService } from './notification-client.service';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  providers: [NotificationClientService],
  exports: [NotificationClientService],
})
export class NotificationModule {}
