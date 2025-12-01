import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ========== Types ==========

export type NotificationFrequency = 'daily' | 'weekly' | 'on_match';
export type ChannelType = 'email' | 'slack' | 'teams';

export interface NotificationChannel {
  type: ChannelType;
  enabled: boolean;
  recipients?: string[];
  webhookUrl?: string;
  channelName?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  frequency: NotificationFrequency;
  recipients: string[];
  threshold?: number;
  channels?: NotificationChannel[];
  includeTopResults?: boolean;
  includeSummary?: boolean;
}

export interface SearchFilters {
  domains?: string[];
  tags?: string[];
  status?: string[];
  campaignIds?: string[];
  folderIds?: string[];
  minClicks?: number;
  maxClicks?: number;
  startDate?: string;
  endDate?: string;
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export type SavedSearchVisibility = 'private' | 'team';

export interface SavedSearch {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  description?: string;
  query?: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  visibility: SavedSearchVisibility;
  notification?: NotificationSettings;
  isPinned: boolean;
  usageCount: number;
  lastUsedAt?: string;
  lastResultCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchInput {
  name: string;
  description?: string;
  query?: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  visibility?: SavedSearchVisibility;
  notification?: NotificationSettings;
}

export interface UpdateSavedSearchInput extends Partial<CreateSavedSearchInput> {}

export interface SavedSearchExecuteResult {
  search: SavedSearch;
  results: {
    total: number;
    hits: any[];
    page: number;
    limit: number;
  };
}

// ========== Hooks ==========

/**
 * Get all saved searches for the current user
 */
export function useSavedSearches(options?: { includeTeam?: boolean }) {
  return useQuery({
    queryKey: ['saved-searches', options],
    queryFn: async () => {
      const { data } = await api.get<SavedSearch[]>('/api/v1/saved-searches', {
        params: { includeTeam: options?.includeTeam },
      });
      return data;
    },
  });
}

/**
 * Get popular team searches
 */
export function usePopularSearches(limit: number = 10) {
  return useQuery({
    queryKey: ['saved-searches', 'popular', limit],
    queryFn: async () => {
      const { data } = await api.get<SavedSearch[]>('/api/v1/saved-searches/popular', {
        params: { limit },
      });
      return data;
    },
  });
}

/**
 * Get a single saved search by ID
 */
export function useSavedSearch(id: string) {
  return useQuery({
    queryKey: ['saved-search', id],
    queryFn: async () => {
      const { data } = await api.get<SavedSearch>(`/api/v1/saved-searches/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new saved search
 */
export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSavedSearchInput) => {
      const { data } = await api.post<SavedSearch>('/api/v1/saved-searches', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

/**
 * Update a saved search
 */
export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateSavedSearchInput) => {
      const { data } = await api.put<SavedSearch>(`/api/v1/saved-searches/${id}`, input);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      queryClient.invalidateQueries({ queryKey: ['saved-search', data.id] });
    },
  });
}

/**
 * Delete a saved search
 */
export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/saved-searches/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

/**
 * Execute a saved search
 */
export function useExecuteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      page,
      limit,
    }: {
      id: string;
      page?: number;
      limit?: number;
    }) => {
      const { data } = await api.post<SavedSearchExecuteResult>(
        `/api/v1/saved-searches/${id}/execute`,
        null,
        { params: { page, limit } },
      );
      return data;
    },
    onSuccess: (data) => {
      // Invalidate to refresh usage stats
      queryClient.invalidateQueries({ queryKey: ['saved-search', data.search.id] });
    },
  });
}

/**
 * Duplicate a saved search
 */
export function useDuplicateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { data } = await api.post<SavedSearch>(
        `/api/v1/saved-searches/${id}/duplicate`,
        null,
        { params: { name } },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

/**
 * Toggle pin status of a saved search
 */
export function useTogglePinSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<SavedSearch>(`/api/v1/saved-searches/${id}/pin`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      queryClient.invalidateQueries({ queryKey: ['saved-search', data.id] });
    },
  });
}

/**
 * Share/unshare a saved search
 */
export function useShareSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: SavedSearchVisibility }) => {
      const { data } = await api.post<SavedSearch>(
        `/api/v1/saved-searches/${id}/share`,
        null,
        { params: { visibility } },
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      queryClient.invalidateQueries({ queryKey: ['saved-search', data.id] });
    },
  });
}

/**
 * Test notification configuration
 */
export function useTestNotification() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ success: boolean; errors: string[] }>(
        `/api/v1/saved-searches/${id}/test-notification`,
      );
      return data;
    },
  });
}

/**
 * Update notification settings for a saved search
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      notification,
    }: {
      id: string;
      notification: NotificationSettings;
    }) => {
      const { data } = await api.put<SavedSearch>(`/api/v1/saved-searches/${id}`, {
        notification,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      queryClient.invalidateQueries({ queryKey: ['saved-search', data.id] });
    },
  });
}

// ========== Helper Functions ==========

/**
 * Get frequency label
 */
export function getFrequencyLabel(frequency: NotificationFrequency): string {
  const labels: Record<NotificationFrequency, string> = {
    daily: '每日',
    weekly: '每周',
    on_match: '即时匹配',
  };
  return labels[frequency] || frequency;
}

/**
 * Get channel type label
 */
export function getChannelTypeLabel(type: ChannelType): string {
  const labels: Record<ChannelType, string> = {
    email: '邮件',
    slack: 'Slack',
    teams: 'Microsoft Teams',
  };
  return labels[type] || type;
}

/**
 * Get channel type icon
 */
export function getChannelTypeIcon(type: ChannelType): string {
  const icons: Record<ChannelType, string> = {
    email: 'mail',
    slack: 'slack',
    teams: 'microsoft-teams',
  };
  return icons[type] || 'bell';
}

/**
 * Get visibility label
 */
export function getVisibilityLabel(visibility: SavedSearchVisibility): string {
  return visibility === 'team' ? '团队可见' : '仅自己可见';
}

/**
 * Check if notification settings are valid
 */
export function isNotificationSettingsValid(settings?: NotificationSettings): boolean {
  if (!settings?.enabled) return true; // Disabled is valid

  // Check if at least one channel is configured
  if (settings.channels && settings.channels.length > 0) {
    return settings.channels.some((channel) => {
      if (!channel.enabled) return false;
      if (channel.type === 'email') {
        return channel.recipients && channel.recipients.length > 0;
      }
      return !!channel.webhookUrl;
    });
  }

  // Legacy format: check recipients
  return settings.recipients && settings.recipients.length > 0;
}

/**
 * Create default notification settings
 */
export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    enabled: false,
    frequency: 'daily',
    recipients: [],
    threshold: 1,
    channels: [],
    includeTopResults: true,
    includeSummary: true,
  };
}

/**
 * Create a notification channel
 */
export function createNotificationChannel(
  type: ChannelType,
  config?: Partial<NotificationChannel>,
): NotificationChannel {
  return {
    type,
    enabled: true,
    ...config,
  };
}
