import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check for internal API key authentication
    const request = context.switchToHttp().getRequest();
    const internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (internalApiKey) {
      const authHeader = request.headers.authorization;
      const xInternalKey = request.headers['x-internal-api-key'];

      // Check Bearer token matches internal API key
      if (authHeader === `Bearer ${internalApiKey}`) {
        request.user = {
          sub: 'system',
          email: 'system@internal',
          role: 'INTERNAL',
        };
        return true;
      }

      // Check x-internal-api-key header
      if (xInternalKey === internalApiKey) {
        request.user = {
          sub: 'system',
          email: 'system@internal',
          role: 'INTERNAL',
        };
        return true;
      }
    }

    return super.canActivate(context);
  }
}
