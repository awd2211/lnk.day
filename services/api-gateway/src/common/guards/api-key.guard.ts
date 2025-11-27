import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    try {
      // Validate API key with user-service
      const userServiceUrl = this.configService.get('USER_SERVICE_URL', 'http://localhost:60001');
      const response = await axios.get(`${userServiceUrl}/api-keys/validate`, {
        headers: { 'x-api-key': apiKey },
      });

      if (response.data?.valid) {
        // Attach user info to request
        request.user = response.data.user;
        request.apiKey = response.data.apiKey;
        return true;
      }

      throw new UnauthorizedException('Invalid API key');
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid API key');
      }
      throw new UnauthorizedException('Failed to validate API key');
    }
  }
}
