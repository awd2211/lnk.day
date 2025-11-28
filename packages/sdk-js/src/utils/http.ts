import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import type { ApiError, LnkClientConfig } from '../types';

export class HttpClient {
  private client: AxiosInstance;
  private config: LnkClientConfig;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(config: LnkClientConfig) {
    this.config = config;
    this.accessToken = config.accessToken;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.lnk.day',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '@lnk/sdk/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth headers
    this.client.interceptors.request.use(
      (config) => {
        if (this.config.apiKey) {
          config.headers['X-API-Key'] = this.config.apiKey;
        } else if (this.accessToken) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 with token refresh
        if (
          error.response?.status === 401 &&
          this.refreshToken &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          try {
            await this.refreshAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            return Promise.reject(this.transformError(error));
          }
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  private transformError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as any;
      return {
        statusCode: error.response.status,
        message: data?.message || error.message,
        error: data?.error,
        details: data?.details,
      };
    }

    if (error.request) {
      return {
        statusCode: 0,
        message: 'Network error - no response received',
        error: 'NETWORK_ERROR',
      };
    }

    return {
      statusCode: 0,
      message: error.message || 'Unknown error',
      error: 'UNKNOWN_ERROR',
    };
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      `${this.config.baseUrl || 'https://api.lnk.day'}/auth/refresh`,
      { refreshToken: this.refreshToken }
    );

    this.accessToken = response.data.accessToken;
    this.refreshToken = response.data.refreshToken;
    this.tokenExpiresAt = response.data.expiresAt;

    if (this.config.onTokenRefresh) {
      this.config.onTokenRefresh(this.accessToken!);
    }
  }

  setTokens(accessToken: string, refreshToken?: string, expiresAt?: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = expiresAt;
  }

  clearTokens(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiresAt = undefined;
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}
