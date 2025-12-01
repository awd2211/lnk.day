import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CircuitBreakerService, HttpRetryService } from '@lnk/nestjs-common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly userServiceUrl: string;
  private readonly circuitBreakerName = 'user-service-auth';

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly httpRetry: HttpRetryService,
  ) {
    this.userServiceUrl = this.configService.get('USER_SERVICE_URL', 'http://localhost:60002');
  }

  /**
   * 执行带熔断器和重试的 HTTP 请求
   */
  private async executeWithProtection<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.circuitBreaker.execute(
      this.circuitBreakerName,
      () => this.httpRetry.executeWithRetry(fn, {
        maxRetries: 3,
        initialDelay: 500,
        retryableErrors: [408, 429, 500, 502, 503, 504],
        onRetry: (attempt, error) => {
          this.logger.warn(`${operation} retry attempt ${attempt}: ${error.message}`);
        },
      }),
      {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000, // 熔断器打开持续时间
      },
    );
  }

  async login(email: string, password: string) {
    try {
      const response = await this.executeWithProtection('login', () =>
        axios.post(`${this.userServiceUrl}/api/v1/auth/login`, { email, password }),
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid credentials');
      }
      this.logger.error(`Login failed: ${error.message}`);
      throw new BadRequestException(error.response?.data?.message || 'Login failed');
    }
  }

  async register(data: { email: string; password: string; name: string }) {
    try {
      const response = await this.executeWithProtection('register', () =>
        axios.post(`${this.userServiceUrl}/api/v1/auth/register`, data),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Registration failed: ${error.message}`);
      throw new BadRequestException(error.response?.data?.message || 'Registration failed');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const response = await this.executeWithProtection('refreshToken', () =>
        axios.post(`${this.userServiceUrl}/api/v1/auth/refresh`, { refreshToken }),
      );
      return response.data;
    } catch (error: any) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateToken(token: string) {
    try {
      const response = await this.executeWithProtection('validateToken', () =>
        axios.get(`${this.userServiceUrl}/api/v1/auth/validate`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data;
    } catch (error: any) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async forgotPassword(email: string) {
    try {
      const response = await this.executeWithProtection('forgotPassword', () =>
        axios.post(`${this.userServiceUrl}/api/v1/auth/forgot-password`, { email }),
      );
      return response.data;
    } catch (error: any) {
      // Don't reveal if email exists
      return { message: 'If this email exists, a reset link has been sent' };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const response = await this.executeWithProtection('resetPassword', () =>
        axios.post(`${this.userServiceUrl}/api/v1/auth/reset-password`, { token, newPassword }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Password reset failed: ${error.message}`);
      throw new BadRequestException(error.response?.data?.message || 'Password reset failed');
    }
  }

  // ========== 2FA Methods ==========

  async get2FAStatus(token: string) {
    try {
      const response = await this.executeWithProtection('get2FAStatus', () =>
        axios.get(`${this.userServiceUrl}/api/v1/auth/2fa/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get 2FA status failed: ${error.message}`);
      throw new BadRequestException(error.response?.data?.message || 'Failed to get 2FA status');
    }
  }

  async enable2FA(token: string) {
    try {
      const response = await this.executeWithProtection('enable2FA', () =>
        axios.post(`${this.userServiceUrl}/api/v1/auth/2fa/enable`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Enable 2FA failed: ${error.message}`);
      throw new BadRequestException(error.response?.data?.message || 'Failed to enable 2FA');
    }
  }

  async verify2FA(token: string, code: string) {
    try {
      const response = await this.executeWithProtection('verify2FA', () =>
        axios.post(`${this.userServiceUrl}/api/v1/auth/2fa/verify`, { code }, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Verify 2FA failed: ${error.message}`);
      throw new BadRequestException(error.response?.data?.message || 'Invalid 2FA code');
    }
  }

  async disable2FA(token: string, code: string) {
    try {
      const response = await this.executeWithProtection('disable2FA', () =>
        axios.delete(`${this.userServiceUrl}/api/v1/auth/2fa/disable`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { code },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Disable 2FA failed: ${error.message}`);
      throw new BadRequestException(error.response?.data?.message || 'Failed to disable 2FA');
    }
  }

  async regenerateBackupCodes(token: string, code: string) {
    try {
      const response = await this.executeWithProtection('regenerateBackupCodes', () =>
        axios.post(`${this.userServiceUrl}/api/v1/auth/2fa/regenerate-backup-codes`, { code }, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Regenerate backup codes failed: ${error.message}`);
      throw new BadRequestException(error.response?.data?.message || 'Failed to regenerate backup codes');
    }
  }
}
