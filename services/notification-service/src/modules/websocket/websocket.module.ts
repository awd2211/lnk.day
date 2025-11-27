import { Module } from '@nestjs/common';

import { RealtimeGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { WebsocketController } from './websocket.controller';

@Module({
  controllers: [WebsocketController],
  providers: [RealtimeGateway, WebsocketService],
  exports: [WebsocketService, RealtimeGateway],
})
export class WebsocketModule {}
