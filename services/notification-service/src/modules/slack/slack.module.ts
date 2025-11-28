import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { SlackInstallation } from './entities/slack-installation.entity';
import { SlackService } from './slack.service';
import { SlackOAuthService } from './slack-oauth.service';
import { SlackCommandsService } from './slack-commands.service';
import { SlackController } from './slack.controller';
import { SlackProcessor } from './slack.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([SlackInstallation]),
    BullModule.registerQueue({
      name: 'slack',
    }),
  ],
  controllers: [SlackController],
  providers: [
    SlackService,
    SlackOAuthService,
    SlackCommandsService,
    SlackProcessor,
  ],
  exports: [SlackService, SlackOAuthService],
})
export class SlackModule {}
