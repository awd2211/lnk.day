import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AuthService {
  private readonly userServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.userServiceUrl = this.configService.get('USER_SERVICE_URL', 'http://localhost:60001');
  }

  async login(email: string, password: string) {
    try {
      const response = await axios.post(`${this.userServiceUrl}/auth/login`, {
        email,
        password,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new BadRequestException(error.response?.data?.message || 'Login failed');
    }
  }

  async register(data: { email: string; password: string; name: string }) {
    try {
      const response = await axios.post(`${this.userServiceUrl}/auth/register`, data);
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(error.response?.data?.message || 'Registration failed');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post(`${this.userServiceUrl}/auth/refresh`, {
        refreshToken,
      });
      return response.data;
    } catch (error: any) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateToken(token: string) {
    try {
      const response = await axios.get(`${this.userServiceUrl}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async forgotPassword(email: string) {
    try {
      const response = await axios.post(`${this.userServiceUrl}/auth/forgot-password`, { email });
      return response.data;
    } catch (error: any) {
      // Don't reveal if email exists
      return { message: 'If this email exists, a reset link has been sent' };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const response = await axios.post(`${this.userServiceUrl}/auth/reset-password`, {
        token,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(error.response?.data?.message || 'Password reset failed');
    }
  }
}
