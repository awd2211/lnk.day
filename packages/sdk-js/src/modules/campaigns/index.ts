import type { HttpClient } from '../../utils/http';
import type {
  Campaign,
  CreateCampaignParams,
  UpdateCampaignParams,
  PaginationParams,
  PaginatedResponse,
  Link,
} from '../../types';

export interface CampaignFilter {
  search?: string;
  status?: Campaign['status'];
  tags?: string[];
  startDateAfter?: string;
  startDateBefore?: string;
}

export interface CampaignGoal {
  id: string;
  campaignId: string;
  name: string;
  type: 'clicks' | 'conversions' | 'revenue';
  target: number;
  current: number;
  progress: number;
  completedAt?: string;
}

export interface CampaignAnalytics {
  totalClicks: number;
  uniqueVisitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  topPerformingLinks: Array<{
    linkId: string;
    shortCode: string;
    clicks: number;
  }>;
  clicksByDay: Array<{ date: string; clicks: number }>;
  clicksByCountry: Array<{ country: string; clicks: number }>;
}

export class CampaignsModule {
  constructor(private http: HttpClient) {}

  async create(params: CreateCampaignParams): Promise<Campaign> {
    return this.http.post<Campaign>('/campaigns', params);
  }

  async get(campaignId: string): Promise<Campaign> {
    return this.http.get<Campaign>(`/campaigns/${campaignId}`);
  }

  async update(campaignId: string, params: UpdateCampaignParams): Promise<Campaign> {
    return this.http.patch<Campaign>(`/campaigns/${campaignId}`, params);
  }

  async delete(campaignId: string): Promise<void> {
    await this.http.delete(`/campaigns/${campaignId}`);
  }

  async list(
    filter?: CampaignFilter,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Campaign>> {
    return this.http.get<PaginatedResponse<Campaign>>('/campaigns', {
      ...filter,
      ...pagination,
    });
  }

  async activate(campaignId: string): Promise<Campaign> {
    return this.http.post<Campaign>(`/campaigns/${campaignId}/activate`);
  }

  async pause(campaignId: string): Promise<Campaign> {
    return this.http.post<Campaign>(`/campaigns/${campaignId}/pause`);
  }

  async complete(campaignId: string): Promise<Campaign> {
    return this.http.post<Campaign>(`/campaigns/${campaignId}/complete`);
  }

  async archive(campaignId: string): Promise<Campaign> {
    return this.http.post<Campaign>(`/campaigns/${campaignId}/archive`);
  }

  async duplicate(campaignId: string, name?: string): Promise<Campaign> {
    return this.http.post<Campaign>(`/campaigns/${campaignId}/duplicate`, { name });
  }

  async getLinks(
    campaignId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Link>> {
    return this.http.get<PaginatedResponse<Link>>(
      `/campaigns/${campaignId}/links`,
      pagination
    );
  }

  async addLinks(campaignId: string, linkIds: string[]): Promise<void> {
    await this.http.post(`/campaigns/${campaignId}/links`, { linkIds });
  }

  async removeLinks(campaignId: string, linkIds: string[]): Promise<void> {
    await this.http.delete(`/campaigns/${campaignId}/links`);
  }

  async getAnalytics(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CampaignAnalytics> {
    return this.http.get(`/campaigns/${campaignId}/analytics`, {
      startDate,
      endDate,
    });
  }

  async getGoals(campaignId: string): Promise<CampaignGoal[]> {
    return this.http.get(`/campaigns/${campaignId}/goals`);
  }

  async createGoal(
    campaignId: string,
    goal: Omit<CampaignGoal, 'id' | 'campaignId' | 'current' | 'progress' | 'completedAt'>
  ): Promise<CampaignGoal> {
    return this.http.post(`/campaigns/${campaignId}/goals`, goal);
  }

  async updateGoal(
    campaignId: string,
    goalId: string,
    updates: Partial<Pick<CampaignGoal, 'name' | 'target'>>
  ): Promise<CampaignGoal> {
    return this.http.patch(`/campaigns/${campaignId}/goals/${goalId}`, updates);
  }

  async deleteGoal(campaignId: string, goalId: string): Promise<void> {
    await this.http.delete(`/campaigns/${campaignId}/goals/${goalId}`);
  }

  async export(
    campaignId: string,
    format: 'csv' | 'xlsx' | 'pdf' = 'csv'
  ): Promise<Blob> {
    return this.http.get(`/campaigns/${campaignId}/export`, { format });
  }
}
