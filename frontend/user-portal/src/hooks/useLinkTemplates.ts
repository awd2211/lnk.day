import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { linkTemplateService } from '@/lib/api';

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface LinkTemplate {
  id: string;
  name: string;
  description?: string;
  domainId?: string;
  slugPrefix?: string;
  slugSuffix?: string;
  defaultRedirectType: 'temporary' | 'permanent';
  utmParams?: UTMParams;
  passwordEnabled: boolean;
  expirationDays?: number;
  tags: string[];
  folderId?: string;
  teamId: string;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLinkTemplateData {
  name: string;
  description?: string;
  domainId?: string;
  slugPrefix?: string;
  slugSuffix?: string;
  defaultRedirectType?: 'temporary' | 'permanent';
  utmParams?: UTMParams;
  passwordEnabled?: boolean;
  expirationDays?: number;
  tags?: string[];
  folderId?: string;
}

export interface UpdateLinkTemplateData extends Partial<CreateLinkTemplateData> {}

export interface LinkTemplateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  favoritesOnly?: boolean;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  config: Partial<CreateLinkTemplateData>;
}

// Query: Get all templates
export function useLinkTemplates(params?: LinkTemplateQueryParams) {
  return useQuery({
    queryKey: ['link-templates', params],
    queryFn: async () => {
      const { data } = await linkTemplateService.getAll(params);
      return data as { items: LinkTemplate[]; total: number; page: number; limit: number };
    },
  });
}

// Query: Get single template
export function useLinkTemplate(id: string | null) {
  return useQuery({
    queryKey: ['link-templates', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await linkTemplateService.getOne(id);
      return data as LinkTemplate;
    },
    enabled: !!id,
  });
}

// Query: Get presets
export function useTemplatePresets() {
  return useQuery({
    queryKey: ['link-templates', 'presets'],
    queryFn: async () => {
      const { data } = await linkTemplateService.getPresets();
      return data as TemplatePreset[];
    },
  });
}

// Query: Get most used templates
export function useMostUsedTemplates(limit?: number) {
  return useQuery({
    queryKey: ['link-templates', 'most-used', limit],
    queryFn: async () => {
      const { data } = await linkTemplateService.getMostUsed(limit);
      return data as LinkTemplate[];
    },
  });
}

// Query: Get recently used templates
export function useRecentlyUsedTemplates(limit?: number) {
  return useQuery({
    queryKey: ['link-templates', 'recently-used', limit],
    queryFn: async () => {
      const { data } = await linkTemplateService.getRecentlyUsed(limit);
      return data as LinkTemplate[];
    },
  });
}

// Mutation: Create template
export function useCreateLinkTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLinkTemplateData) => {
      const response = await linkTemplateService.create(data);
      return response.data as LinkTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
    },
  });
}

// Mutation: Update template
export function useUpdateLinkTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLinkTemplateData }) => {
      const response = await linkTemplateService.update(id, data);
      return response.data as LinkTemplate;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
      queryClient.invalidateQueries({ queryKey: ['link-templates', id] });
    },
  });
}

// Mutation: Delete template
export function useDeleteLinkTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await linkTemplateService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
    },
  });
}

// Mutation: Toggle favorite
export function useToggleTemplateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await linkTemplateService.toggleFavorite(id);
      return response.data as LinkTemplate;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
      queryClient.invalidateQueries({ queryKey: ['link-templates', id] });
    },
  });
}

// Mutation: Create link from template
export function useCreateLinkFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      originalUrl: string;
      customSlug?: string;
      title?: string;
    }) => {
      const response = await linkTemplateService.createLinkFromTemplate(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link-templates'] }); // Update usage count
    },
  });
}

// Mutation: Create template from preset
export function useCreateTemplateFromPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ presetId, name }: { presetId: string; name: string }) => {
      const response = await linkTemplateService.createFromPreset(presetId, name);
      return response.data as LinkTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
    },
  });
}

// Preset categories for UI
export const TEMPLATE_CATEGORIES = [
  { id: 'marketing', name: '营销推广', icon: 'megaphone' },
  { id: 'social', name: '社交媒体', icon: 'share-2' },
  { id: 'email', name: '邮件营销', icon: 'mail' },
  { id: 'affiliate', name: '联盟营销', icon: 'users' },
  { id: 'internal', name: '内部使用', icon: 'lock' },
  { id: 'custom', name: '自定义', icon: 'settings' },
];
