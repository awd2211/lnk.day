import {
  Controller,
  All,
  Req,
  Res,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { ProxyService } from './proxy.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@ApiTags('proxy')
@Controller('api')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('*')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Proxy requests to backend services' })
  async proxyRequest(@Req() req: Request, @Res() res: Response) {
    // req.path 在 NestJS 版本控制下是完整路径如 /v1/api/links
    // 需要去掉版本前缀 /v1/api，然后加上 /api 前缀
    const resourcePath = req.path.replace(/^\/v\d+\/api/, ''); // /v1/api/links -> /links
    const path = `/api${resourcePath}`;
    const route = this.proxyService.findRoute(path);

    if (!route) {
      throw new HttpException('Route not found', 404);
    }

    // Check if route requires auth and user is not authenticated
    if (route.requireAuth && !(req as any).user) {
      throw new HttpException('Unauthorized', 401);
    }

    try {
      // Forward relevant headers
      const headers: Record<string, string> = {
        'content-type': req.headers['content-type'] || 'application/json',
        'x-user-id': (req as any).user?.id || '',
        'x-user-email': (req as any).user?.email || '',
        'x-request-id': req.headers['x-request-id'] as string || crypto.randomUUID(),
        'x-forwarded-for': req.ip || '',
      };

      // Forward authorization header for downstream services
      if (req.headers.authorization) {
        headers['authorization'] = req.headers.authorization as string;
      }

      // Add team ID if present
      if (req.headers['x-team-id']) {
        headers['x-team-id'] = req.headers['x-team-id'] as string;
      }

      const result = await this.proxyService.proxyRequest(
        req.method as any,
        path,
        headers,
        req.body,
        req.query as Record<string, any>,
      );

      // Set response headers
      if (result.headers) {
        const allowedHeaders = ['content-type', 'x-total-count', 'x-page', 'x-limit'];
        for (const header of allowedHeaders) {
          if (result.headers[header]) {
            res.setHeader(header, result.headers[header]);
          }
        }
      }

      return res.status(result.statusCode).json(result.data);
    } catch (error: any) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error';
      return res.status(status).json({
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path,
      });
    }
  }
}
