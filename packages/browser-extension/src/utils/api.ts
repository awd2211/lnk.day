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
}

export interface ApiError {
  message: string;
  statusCode: number;
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

  async createLink(params: CreateLinkParams): Promise<Link> {
    return this.request<Link>('/links', {
      method: 'POST',
      body: JSON.stringify({
        originalUrl: params.originalUrl,
        customCode: params.customCode,
        title: params.title,
        tags: params.tags,
        campaignId: params.campaignId,
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

  async getCampaigns(): Promise<Array<{ id: string; name: string }>> {
    const result = await this.request<{ data: Array<{ id: string; name: string }> }>(
      '/campaigns?limit=50'
    );
    return result.data;
  }

  async getTags(): Promise<string[]> {
    return this.request<string[]>('/links/tags');
  }

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
