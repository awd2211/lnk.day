import type { HttpClient } from '../../utils/http';
import type {
  Link,
  CreateLinkParams,
  UpdateLinkParams,
  LinkFilter,
  PaginationParams,
  PaginatedResponse,
} from '../../types';

export class LinksModule {
  constructor(private http: HttpClient) {}

  async create(params: CreateLinkParams): Promise<Link> {
    return this.http.post<Link>('/links', params);
  }

  async get(linkId: string): Promise<Link> {
    return this.http.get<Link>(`/links/${linkId}`);
  }

  async getByCode(shortCode: string): Promise<Link> {
    return this.http.get<Link>(`/links/code/${shortCode}`);
  }

  async update(linkId: string, params: UpdateLinkParams): Promise<Link> {
    return this.http.patch<Link>(`/links/${linkId}`, params);
  }

  async delete(linkId: string): Promise<void> {
    await this.http.delete(`/links/${linkId}`);
  }

  async list(
    filter?: LinkFilter,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Link>> {
    return this.http.get<PaginatedResponse<Link>>('/links', {
      ...filter,
      ...pagination,
    });
  }

  async bulkCreate(links: CreateLinkParams[]): Promise<{
    created: Link[];
    failed: Array<{ index: number; error: string }>;
  }> {
    return this.http.post('/links/bulk', { links });
  }

  async bulkDelete(linkIds: string[]): Promise<{
    deleted: number;
    failed: string[];
  }> {
    return this.http.post('/links/bulk-delete', { linkIds });
  }

  async bulkUpdate(
    linkIds: string[],
    updates: UpdateLinkParams
  ): Promise<{
    updated: number;
    failed: string[];
  }> {
    return this.http.post('/links/bulk-update', { linkIds, updates });
  }

  async archive(linkId: string): Promise<Link> {
    return this.http.post<Link>(`/links/${linkId}/archive`);
  }

  async unarchive(linkId: string): Promise<Link> {
    return this.http.post<Link>(`/links/${linkId}/unarchive`);
  }

  async duplicate(linkId: string, customCode?: string): Promise<Link> {
    return this.http.post<Link>(`/links/${linkId}/duplicate`, { customCode });
  }

  async getStats(linkId: string): Promise<{
    clicks: number;
    uniqueClicks: number;
    lastClickedAt?: string;
    topCountries: Array<{ country: string; clicks: number }>;
    topDevices: Array<{ device: string; clicks: number }>;
  }> {
    return this.http.get(`/links/${linkId}/stats`);
  }

  async export(
    filter?: LinkFilter,
    format: 'csv' | 'xlsx' | 'json' = 'csv'
  ): Promise<Blob> {
    return this.http.get(`/links/export`, {
      ...filter,
      format,
    });
  }

  async validateUrl(url: string): Promise<{
    valid: boolean;
    reachable: boolean;
    finalUrl?: string;
    title?: string;
    description?: string;
    favicon?: string;
  }> {
    return this.http.post('/links/validate-url', { url });
  }

  async checkCodeAvailability(code: string): Promise<{
    available: boolean;
    suggestions?: string[];
  }> {
    return this.http.get('/links/check-code', { code });
  }

  async addTags(linkId: string, tags: string[]): Promise<Link> {
    return this.http.post<Link>(`/links/${linkId}/tags`, { tags });
  }

  async removeTags(linkId: string, tags: string[]): Promise<Link> {
    return this.http.delete<Link>(`/links/${linkId}/tags`);
  }

  async setExpiration(linkId: string, expiresAt: string | null): Promise<Link> {
    return this.http.patch<Link>(`/links/${linkId}`, { expiresAt });
  }

  async setPassword(linkId: string, password: string | null): Promise<Link> {
    return this.http.patch<Link>(`/links/${linkId}`, { password });
  }
}
