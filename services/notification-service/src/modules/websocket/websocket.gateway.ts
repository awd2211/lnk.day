import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

export interface RealtimeEvent {
  type: string;
  channel: string;
  data: any;
  timestamp: string;
}

export interface SubscriptionRequest {
  channels: string[];
  token?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connectedClients = new Map<string, { userId?: string; channels: Set<string> }>();

  constructor(private readonly configService: ConfigService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, { channels: new Set() });

    // 发送连接成功消息
    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string; userId: string },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.userId = data.userId;
      this.logger.log(`Client ${client.id} authenticated as user ${data.userId}`);

      // 自动订阅用户的个人频道
      const userChannel = `user:${data.userId}`;
      clientData.channels.add(userChannel);
      client.join(userChannel);

      client.emit('authenticated', {
        success: true,
        userId: data.userId,
        subscribedChannels: Array.from(clientData.channels),
      });
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscriptionRequest,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) return;

    const subscribedChannels: string[] = [];

    for (const channel of data.channels) {
      // 验证频道访问权限
      if (this.canAccessChannel(clientData.userId, channel)) {
        clientData.channels.add(channel);
        client.join(channel);
        subscribedChannels.push(channel);
        this.logger.debug(`Client ${client.id} subscribed to ${channel}`);
      }
    }

    client.emit('subscribed', {
      channels: subscribedChannels,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channels: string[] },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) return;

    for (const channel of data.channels) {
      clientData.channels.delete(channel);
      client.leave(channel);
    }

    client.emit('unsubscribed', {
      channels: data.channels,
      timestamp: new Date().toISOString(),
    });
  }

  // ========== 公开方法用于从其他服务发送事件 ==========

  /**
   * 发送事件到指定频道
   */
  emitToChannel(channel: string, event: string, data: any): void {
    const payload: RealtimeEvent = {
      type: event,
      channel,
      data,
      timestamp: new Date().toISOString(),
    };
    this.server.to(channel).emit(event, payload);
    this.logger.debug(`Emitted ${event} to channel ${channel}`);
  }

  /**
   * 发送事件到指定用户
   */
  emitToUser(userId: string, event: string, data: any): void {
    this.emitToChannel(`user:${userId}`, event, data);
  }

  /**
   * 发送事件到指定团队
   */
  emitToTeam(teamId: string, event: string, data: any): void {
    this.emitToChannel(`team:${teamId}`, event, data);
  }

  /**
   * 发送链接点击实时事件
   */
  emitLinkClick(teamId: string, linkId: string, clickData: any): void {
    this.emitToTeam(teamId, 'link:click', {
      linkId,
      ...clickData,
    });
  }

  /**
   * 发送链接创建事件
   */
  emitLinkCreated(teamId: string, link: any): void {
    this.emitToTeam(teamId, 'link:created', { link });
  }

  /**
   * 发送链接更新事件
   */
  emitLinkUpdated(teamId: string, link: any): void {
    this.emitToTeam(teamId, 'link:updated', { link });
  }

  /**
   * 发送链接删除事件
   */
  emitLinkDeleted(teamId: string, linkId: string): void {
    this.emitToTeam(teamId, 'link:deleted', { linkId });
  }

  /**
   * 广播到所有连接
   */
  broadcast(event: string, data: any): void {
    const payload: RealtimeEvent = {
      type: event,
      channel: 'broadcast',
      data,
      timestamp: new Date().toISOString(),
    };
    this.server.emit(event, payload);
  }

  /**
   * 获取在线用户数
   */
  getOnlineUsersCount(): number {
    return this.connectedClients.size;
  }

  /**
   * 获取频道订阅者数量
   */
  async getChannelSubscribersCount(channel: string): Promise<number> {
    const room = this.server.sockets.adapter.rooms.get(channel);
    return room ? room.size : 0;
  }

  // ========== 私有方法 ==========

  private canAccessChannel(userId: string | undefined, channel: string): boolean {
    // 公共频道允许所有人访问
    if (channel.startsWith('public:')) {
      return true;
    }

    // 用户频道需要认证
    if (channel.startsWith('user:')) {
      const channelUserId = channel.split(':')[1];
      return userId === channelUserId;
    }

    // 团队频道需要验证成员身份（简化版本，实际应查询数据库）
    if (channel.startsWith('team:')) {
      return !!userId;
    }

    // 链接频道需要认证
    if (channel.startsWith('link:')) {
      return !!userId;
    }

    return false;
  }
}
