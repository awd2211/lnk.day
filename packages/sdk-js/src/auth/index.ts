import type { HttpClient } from '../utils/http';
import type { AuthTokens } from '../types';

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  name?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  teams: Array<{ id: string; name: string; role: string }>;
  createdAt: string;
}

export class AuthModule {
  constructor(private http: HttpClient) {}

  async login(params: LoginParams): Promise<AuthTokens & { user: User }> {
    const response = await this.http.post<AuthTokens & { user: User }>(
      '/auth/login',
      params
    );

    this.http.setTokens(
      response.accessToken,
      response.refreshToken,
      response.expiresAt
    );

    return response;
  }

  async register(params: RegisterParams): Promise<AuthTokens & { user: User }> {
    const response = await this.http.post<AuthTokens & { user: User }>(
      '/auth/register',
      params
    );

    this.http.setTokens(
      response.accessToken,
      response.refreshToken,
      response.expiresAt
    );

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.http.post('/auth/logout');
    } finally {
      this.http.clearTokens();
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.http.post<AuthTokens>('/auth/refresh', {
      refreshToken,
    });

    this.http.setTokens(
      response.accessToken,
      response.refreshToken,
      response.expiresAt
    );

    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.http.get<User>('/auth/me');
  }

  async updateProfile(data: { name?: string; avatar?: string }): Promise<User> {
    return this.http.patch<User>('/auth/me', data);
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    await this.http.post('/auth/change-password', data);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.http.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.http.post('/auth/reset-password', { token, newPassword });
  }

  async verifyEmail(token: string): Promise<void> {
    await this.http.post('/auth/verify-email', { token });
  }

  async resendVerificationEmail(): Promise<void> {
    await this.http.post('/auth/resend-verification');
  }
}
