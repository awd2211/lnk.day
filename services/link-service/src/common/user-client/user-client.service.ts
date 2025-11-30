import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId?: string;
}

@Injectable()
export class UserClientService {
  private readonly logger = new Logger(UserClientService.name);
  private readonly userServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.userServiceUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://localhost:60002',
    );
    this.internalApiKey = this.configService.get<string>(
      'INTERNAL_API_KEY',
      '',
    );
  }

  private getHeaders() {
    return {
      'x-internal-api-key': this.internalApiKey,
      'Content-Type': 'application/json',
    };
  }

  async getUserById(userId: string): Promise<UserInfo | null> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<UserInfo>(`${this.userServiceUrl}/api/v1/users/internal/validate/${userId}`, {
            headers: this.getHeaders(),
          })
          .pipe(
            catchError((error) => {
              this.logger.error(`Failed to get user ${userId}: ${error.message}`);
              throw error;
            }),
          ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get user failed: ${error.message}`);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<UserInfo | null> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<UserInfo>(`${this.userServiceUrl}/api/v1/users/internal/by-email/${encodeURIComponent(email)}`, {
            headers: this.getHeaders(),
          })
          .pipe(
            catchError((error) => {
              this.logger.error(`Failed to get user by email ${email}: ${error.message}`);
              throw error;
            }),
          ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get user by email failed: ${error.message}`);
      return null;
    }
  }

  async suspendUser(userId: string, reason?: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .post<{ success: boolean }>(
            `${this.userServiceUrl}/api/v1/users/internal/${userId}/suspend`,
            { reason },
            { headers: this.getHeaders() },
          )
          .pipe(
            catchError((error) => {
              this.logger.error(`Failed to suspend user ${userId}: ${error.message}`);
              throw error;
            }),
          ),
      );
      return response.data.success;
    } catch (error: any) {
      this.logger.error(`Suspend user failed: ${error.message}`);
      return false;
    }
  }

  async unsuspendUser(userId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .post<{ success: boolean }>(
            `${this.userServiceUrl}/api/v1/users/internal/${userId}/unsuspend`,
            {},
            { headers: this.getHeaders() },
          )
          .pipe(
            catchError((error) => {
              this.logger.error(`Failed to unsuspend user ${userId}: ${error.message}`);
              throw error;
            }),
          ),
      );
      return response.data.success;
    } catch (error: any) {
      this.logger.error(`Unsuspend user failed: ${error.message}`);
      return false;
    }
  }
}
