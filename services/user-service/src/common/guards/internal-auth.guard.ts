import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const internalKey = request.headers['x-internal-api-key'];
    const expectedKey = this.configService.get('INTERNAL_API_KEY');

    if (!expectedKey) {
      // 如果没有配置内部 API Key，拒绝所有请求
      throw new UnauthorizedException('Internal API not configured');
    }

    if (internalKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
