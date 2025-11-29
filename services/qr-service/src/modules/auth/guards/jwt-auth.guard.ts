import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Check internal API key first (for service-to-service communication)
    const internalKey = request.headers['x-internal-key'];
    const expectedKey = this.configService.get('INTERNAL_API_KEY');

    if (internalKey && expectedKey && internalKey === expectedKey) {
      return true;
    }

    // Fall back to JWT authentication
    return super.canActivate(context);
  }
}
