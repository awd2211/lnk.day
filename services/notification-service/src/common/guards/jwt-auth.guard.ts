import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  teamId?: string;
  roles?: string[];
  permissions?: string[];
  iat: number;
  exp: number;
}

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const PUBLIC_KEY = 'isPublic';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export const Public = () => SetMetadata(PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Check internal API key (service-to-service communication)
    const internalKey = request.headers['x-internal-api-key'];
    const expectedKey = this.configService.get('INTERNAL_API_KEY');

    if (internalKey && internalKey === expectedKey) {
      // Internal requests bypass JWT verification but can include user context
      const userId = request.headers['x-user-id'];
      const teamId = request.headers['x-team-id'];
      if (userId) {
        request.user = {
          sub: userId,
          teamId,
          isInternalRequest: true,
        };
      }
      return true;
    }

    // Extract and verify JWT token
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const jwtSecret = this.configService.get('JWT_SECRET');
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const payload = jwt.verify(token, jwtSecret) as JwtPayload;

      // Validate token expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new UnauthorizedException('Token has expired');
      }

      // Attach user to request
      request.user = payload;

      // Check RBAC requirements
      await this.checkRoles(context, payload);
      await this.checkPermissions(context, payload);

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(request: any): string | null {
    // Try Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Fallback to x-access-token header
    const accessToken = request.headers['x-access-token'];
    if (accessToken) {
      return accessToken;
    }

    // Fallback to cookie
    const cookieToken = request.cookies?.access_token;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  private async checkRoles(context: ExecutionContext, payload: JwtPayload): Promise<void> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return;
    }

    const userRoles = payload.roles || [];

    // Admin role bypasses all role checks
    if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
      return;
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(`Required roles: ${requiredRoles.join(', ')}`);
    }
  }

  private async checkPermissions(context: ExecutionContext, payload: JwtPayload): Promise<void> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return;
    }

    const userPermissions = payload.permissions || [];

    // Admin has all permissions
    const userRoles = payload.roles || [];
    if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
      return;
    }

    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenException(`Required permissions: ${requiredPermissions.join(', ')}`);
    }
  }
}
