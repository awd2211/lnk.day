import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 检查内部 API 密钥（服务间通信）
    const internalKey = request.headers['x-internal-api-key'];
    const expectedKey = this.configService.get('INTERNAL_API_KEY');

    if (internalKey && internalKey === expectedKey) {
      return true;
    }

    // 检查用户 ID（由 API 网关设置）
    const userId = request.headers['x-user-id'];

    if (!userId) {
      throw new UnauthorizedException('Missing user authentication');
    }

    return true;
  }
}
