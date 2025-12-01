/**
 * API utilities for lnk.day browser extension
 */

const API_BASE_URL = 'https://api.lnk.day';

export interface Link {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  title?: string;
  clicks: number;
  createdAt: string;
}

export interface CreateLinkParams {
  originalUrl: string;
  customCode?: string;
  title?: string;
  tags?: string[];
  campaignId?: string;
  folderId?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface QRCodeParams {
  linkId?: string;
  url?: string;
  size?: number;
  format?: 'png' | 'svg';
  color?: string;
  backgroundColor?: string;
}

export interface LinkAnalytics {
  totalClicks: number;
  uniqueClicks: number;
  clicksByDate: Array<{ date: string; clicks: number }>;
  topReferrers: Array<{ referrer: string; clicks: number }>;
  topCountries: Array<{ country: string; clicks: number }>;
  topDevices: Array<{ device: string; clicks: number }>;
  topBrowsers: Array<{ browser: string; clicks: number }>;
}

export interface Folder {
  id: string;
  name: string;
  linkCount: number;
}

export interface Campaign {
  id: string;
  name: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  plan: string;
  usage: { links: number; clicks: number; limit: number };
}

export interface Domain {
  id: string;
  domain: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

class LnkApi {
  private apiKey: string | null = null;

  async init(): Promise<void> {
    const result = await chrome.storage.sync.get(['apiKey']);
    this.apiKey = result.apiKey || null;
  }

  isAuthenticated(): boolean {
    return !!this.apiKey;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
    chrome.storage.sync.set({ apiKey: key });
  }

  clearApiKey(): void {
    this.apiKey = null;
    chrome.storage.sync.remove(['apiKey']);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Not authenticated. Please set your API key.');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Link APIs
  async createLink(params: CreateLinkParams): Promise<Link> {
    return this.request<Link>('/links', {
      method: 'POST',
      body: JSON.stringify({
        originalUrl: params.originalUrl,
        customCode: params.customCode,
        title: params.title,
        tags: params.tags,
        campaignId: params.campaignId,
        folderId: params.folderId,
      }),
    });
  }

  async getRecentLinks(limit: number = 5): Promise<Link[]> {
    const result = await this.request<{ data: Link[] }>(
      `/links?limit=${limit}&sort=createdAt:desc`
    );
    return result.data;
  }

  async getLinkStats(linkId: string): Promise<{
    clicks: number;
    uniqueClicks: number;
    topCountries: Array<{ country: string; clicks: number }>;
    topDevices: Array<{ device: string; clicks: number }>;
  }> {
    return this.request(`/links/${linkId}/stats`);
  }

  async searchLinks(query: string): Promise<Link[]> {
    const result = await this.request<{ data: Link[] }>(
      `/links/search?q=${encodeURIComponent(query)}`
    );
    return result.data;
  }

  async deleteLink(linkId: string): Promise<void> {
    await this.request(`/links/${linkId}`, { method: 'DELETE' });
  }

  async updateLink(linkId: string, data: Partial<CreateLinkParams>): Promise<Link> {
    return this.request<Link>(`/links/${linkId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Bulk operations
  async bulkCreateLinks(links: CreateLinkParams[]): Promise<Link[]> {
    return this.request<Link[]>('/links/bulk', {
      method: 'POST',
      body: JSON.stringify({ links }),
    });
  }

  // Campaign APIs
  async getCampaigns(): Promise<Campaign[]> {
    const result = await this.request<{ data: Campaign[] }>(
      '/campaigns?limit=50'
    );
    return result.data;
  }

  // Tag APIs
  async getTags(): Promise<Tag[]> {
    const result = await this.request<{ data: Tag[] }>('/links/tags');
    return result.data;
  }

  // Domain APIs
  async getDomains(): Promise<Domain[]> {
    const result = await this.request<{ data: Domain[] }>('/domains');
    return result.data;
  }

  async getDefaultDomain(): Promise<Domain | null> {
    const domains = await this.getDomains();
    return domains.find(d => d.isDefault) || domains[0] || null;
  }

  // Folder APIs
  async getFolders(): Promise<Folder[]> {
    const result = await this.request<{ data: Folder[] }>('/folders');
    return result.data;
  }

  // QR Code APIs
  async generateQRCode(params: QRCodeParams): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Not authenticated. Please set your API key.');
    }

    const queryParams = new URLSearchParams();
    if (params.linkId) queryParams.set('linkId', params.linkId);
    if (params.url) queryParams.set('url', params.url);
    if (params.size) queryParams.set('size', params.size.toString());
    if (params.format) queryParams.set('format', params.format);
    if (params.color) queryParams.set('color', params.color);
    if (params.backgroundColor) queryParams.set('backgroundColor', params.backgroundColor);

    const response = await fetch(`${API_BASE_URL}/qr/generate?${queryParams}`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to generate QR code');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // Analytics APIs
  async getLinkAnalytics(linkId: string, period: '7d' | '30d' | '90d' = '7d'): Promise<LinkAnalytics> {
    return this.request<LinkAnalytics>(`/analytics/links/${linkId}?period=${period}`);
  }

  // User APIs
  async getUserInfo(): Promise<UserInfo> {
    return this.request<UserInfo>('/users/me');
  }

  // Auth APIs
  async validateApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        headers: {
          'X-API-Key': key,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const api = new LnkApi();
