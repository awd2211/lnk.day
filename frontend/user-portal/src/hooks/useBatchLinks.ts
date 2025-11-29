import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ========== Types ==========

export type LinkStatus = 'active' | 'inactive' | 'archived' | 'deleted';

export interface BatchOperationResult {
  operation: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  successIds: string[];
  errors: Array<{ linkId: string; error: string }>;
}

export interface ImportResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  createdLinks: Array<{
    originalUrl: string;
    shortUrl: string;
    shortCode: string;
  }>;
  errors: Array<{
    row: number;
    originalUrl: string;
    error: string;
  }>;
}

export interface ImportLinkItem {
  originalUrl: string;
  customSlug?: string;
  title?: string;
  tags?: string[];
  folderId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface BatchUpdateOptions {
  addTags?: string[];
  removeTags?: string[];
  setTags?: string[];
  folderId?: string;
  status?: LinkStatus;
  expiresAt?: string;
  removeExpiry?: boolean;
}

export interface BulkSelectQuery {
  folderId?: string;
  tags?: string;
  status?: LinkStatus;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
}

export type ExportSortField = 'createdAt' | 'updatedAt' | 'totalClicks' | 'title' | 'shortCode';
export type ExportSortOrder = 'asc' | 'desc';

export interface ExportOptions {
  format?: 'csv' | 'json' | 'xlsx';
  folderId?: string;
  tags?: string[];
  status?: LinkStatus;
  startDate?: string;
  endDate?: string;
  fields?: string[];

  // Advanced options
  search?: string;
  sortBy?: ExportSortField;
  sortOrder?: ExportSortOrder;
  limit?: number;
  includeAnalytics?: boolean;
  minClicks?: number;
  maxClicks?: number;
  hasExpiry?: boolean;
  hasPassword?: boolean;
  filenamePrefix?: string;
  dateFormat?: string;
  tagSeparator?: string;
}

// ========== Batch Update Hooks ==========

/**
 * 批量更新链接（标签、文件夹、状态、过期时间等）
 */
export function useBatchUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkIds,
      options,
      teamId,
    }: {
      linkIds: string[];
      options: BatchUpdateOptions;
      teamId?: string;
    }) => {
      const { data } = await api.post<BatchOperationResult>(
        '/links/batch/update',
        { linkIds, ...options },
        {
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/**
 * 批量删除链接
 */
export function useBatchDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkIds,
      permanent = false,
      teamId,
    }: {
      linkIds: string[];
      permanent?: boolean;
      teamId?: string;
    }) => {
      const { data } = await api.post<BatchOperationResult>(
        '/links/batch/delete',
        { linkIds, permanent },
        {
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/**
 * 批量归档链接
 */
export function useBatchArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkIds,
      teamId,
    }: {
      linkIds: string[];
      teamId?: string;
    }) => {
      const { data } = await api.post<BatchOperationResult>(
        '/links/batch/archive',
        { linkIds },
        {
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/**
 * 批量恢复链接
 */
export function useBatchRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkIds,
      teamId,
    }: {
      linkIds: string[];
      teamId?: string;
    }) => {
      const { data } = await api.post<BatchOperationResult>(
        '/links/batch/restore',
        { linkIds },
        {
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/**
 * 批量移动到文件夹
 */
export function useBatchMoveToFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkIds,
      folderId,
      teamId,
    }: {
      linkIds: string[];
      folderId: string | null;
      teamId?: string;
    }) => {
      const { data } = await api.post<BatchOperationResult>(
        '/links/batch/move',
        { linkIds, folderId },
        {
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

/**
 * 批量添加标签
 */
export function useBatchAddTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkIds,
      tags,
      teamId,
    }: {
      linkIds: string[];
      tags: string[];
      teamId?: string;
    }) => {
      const { data } = await api.post<BatchOperationResult>(
        '/links/batch/tags/add',
        { linkIds, tags },
        {
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/**
 * 批量移除标签
 */
export function useBatchRemoveTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkIds,
      tags,
      teamId,
    }: {
      linkIds: string[];
      tags: string[];
      teamId?: string;
    }) => {
      const { data } = await api.post<BatchOperationResult>(
        '/links/batch/tags/remove',
        { linkIds, tags },
        {
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

// ========== Bulk Select Hook ==========

/**
 * 根据条件批量选择链接ID
 */
export function useBulkSelectIds(query: BulkSelectQuery, teamId?: string) {
  return useQuery({
    queryKey: ['bulk-select', query, teamId],
    queryFn: async () => {
      const { data } = await api.get<{ ids: string[]; total: number }>(
        '/links/batch/select',
        {
          params: query,
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    enabled: Object.keys(query).length > 0,
  });
}

/**
 * 按需批量选择链接ID（mutation版本）
 */
export function useBulkSelectIdsMutation() {
  return useMutation({
    mutationFn: async ({
      query,
      teamId,
    }: {
      query: BulkSelectQuery;
      teamId?: string;
    }) => {
      const { data } = await api.get<{ ids: string[]; total: number }>(
        '/links/batch/select',
        {
          params: query,
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
  });
}

// ========== Import Hooks ==========

/**
 * 批量导入链接 (JSON)
 */
export function useImportLinks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      links,
      skipDuplicates = false,
      teamId,
    }: {
      links: ImportLinkItem[];
      skipDuplicates?: boolean;
      teamId?: string;
    }) => {
      const { data } = await api.post<ImportResult>(
        '/links/batch/import',
        { links, skipDuplicates },
        {
          headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/**
 * 从 CSV 文件批量导入链接
 */
export function useImportFromCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      skipDuplicates = false,
      teamId,
    }: {
      file: File;
      skipDuplicates?: boolean;
      teamId?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipDuplicates', String(skipDuplicates));

      const { data } = await api.post<ImportResult>(
        '/links/batch/import/csv',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(teamId ? { 'X-Team-ID': teamId } : {}),
          },
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/**
 * 获取 CSV 导入模板
 */
export function useCsvTemplate() {
  return useQuery({
    queryKey: ['csv-template'],
    queryFn: async () => {
      const { data } = await api.get<string>('/links/batch/template', {
        responseType: 'text',
      });
      return data;
    },
    enabled: false, // 只在需要时手动触发
    staleTime: Infinity,
  });
}

/**
 * 下载 CSV 导入模板
 */
export function useDownloadCsvTemplate() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get('/links/batch/template', {
        responseType: 'blob',
      });

      // 创建下载链接
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'import-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

// ========== Export Hook ==========

/**
 * 导出链接
 */
export function useExportLinks() {
  return useMutation({
    mutationFn: async ({
      options,
      teamId,
    }: {
      options: ExportOptions;
      teamId?: string;
    }) => {
      const response = await api.get('/links/batch/export', {
        params: {
          format: options.format || 'csv',
          folderId: options.folderId,
          tags: options.tags?.join(','),
          status: options.status,
          startDate: options.startDate,
          endDate: options.endDate,
          fields: options.fields?.join(','),
          // Advanced options
          search: options.search,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
          limit: options.limit,
          includeAnalytics: options.includeAnalytics,
          minClicks: options.minClicks,
          maxClicks: options.maxClicks,
          hasExpiry: options.hasExpiry,
          hasPassword: options.hasPassword,
          filenamePrefix: options.filenamePrefix,
          dateFormat: options.dateFormat,
          tagSeparator: options.tagSeparator,
        },
        headers: teamId ? { 'X-Team-ID': teamId } : undefined,
        responseType: 'blob',
      });

      // 从响应头获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = `links-export.${options.format || 'csv'}`;
      if (contentDisposition) {
        const matches = /filename="(.+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // 下载文件
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { filename };
    },
  });
}

// ========== Composite Hooks ==========

/**
 * 批量操作状态管理 Hook
 * 用于管理批量选择和操作的 UI 状态
 */
export function useBatchSelection() {
  // 这个 hook 可以和 React 的 useState 结合使用
  // 提供一个统一的批量选择管理接口

  const batchUpdate = useBatchUpdate();
  const batchDelete = useBatchDelete();
  const batchArchive = useBatchArchive();
  const batchRestore = useBatchRestore();
  const batchMove = useBatchMoveToFolder();
  const batchAddTags = useBatchAddTags();
  const batchRemoveTags = useBatchRemoveTags();
  const bulkSelect = useBulkSelectIdsMutation();

  const isLoading =
    batchUpdate.isPending ||
    batchDelete.isPending ||
    batchArchive.isPending ||
    batchRestore.isPending ||
    batchMove.isPending ||
    batchAddTags.isPending ||
    batchRemoveTags.isPending ||
    bulkSelect.isPending;

  return {
    // 操作方法
    update: batchUpdate.mutateAsync,
    delete: batchDelete.mutateAsync,
    archive: batchArchive.mutateAsync,
    restore: batchRestore.mutateAsync,
    moveToFolder: batchMove.mutateAsync,
    addTags: batchAddTags.mutateAsync,
    removeTags: batchRemoveTags.mutateAsync,
    selectByQuery: bulkSelect.mutateAsync,

    // 状态
    isLoading,

    // 单个操作状态
    updateState: batchUpdate,
    deleteState: batchDelete,
    archiveState: batchArchive,
    restoreState: batchRestore,
    moveState: batchMove,
    addTagsState: batchAddTags,
    removeTagsState: batchRemoveTags,
  };
}

// ========== Available Export Fields ==========

export const EXPORT_FIELD_CATEGORIES = {
  basic: {
    label: '基本信息',
    fields: [
      { key: 'id', label: '链接ID' },
      { key: 'shortCode', label: '短码' },
      { key: 'originalUrl', label: '原始链接' },
      { key: 'title', label: '标题' },
      { key: 'description', label: '描述' },
      { key: 'domain', label: '域名' },
    ],
  },
  organization: {
    label: '组织分类',
    fields: [
      { key: 'tags', label: '标签' },
      { key: 'folderId', label: '文件夹ID' },
      { key: 'folderName', label: '文件夹名称' },
    ],
  },
  status: {
    label: '状态信息',
    fields: [
      { key: 'status', label: '状态' },
      { key: 'expiresAt', label: '过期时间' },
      { key: 'hasPassword', label: '密码保护' },
      { key: 'hasExpiry', label: '有过期时间' },
    ],
  },
  analytics: {
    label: '分析数据',
    fields: [
      { key: 'totalClicks', label: '总点击数' },
      { key: 'uniqueClicks', label: '独立访客' },
      { key: 'lastClickAt', label: '最后点击时间' },
      { key: 'qrScans', label: 'QR扫描数' },
    ],
  },
  utm: {
    label: 'UTM参数',
    fields: [
      { key: 'utmSource', label: 'UTM Source' },
      { key: 'utmMedium', label: 'UTM Medium' },
      { key: 'utmCampaign', label: 'UTM Campaign' },
      { key: 'utmContent', label: 'UTM Content' },
      { key: 'utmTerm', label: 'UTM Term' },
    ],
  },
  timestamps: {
    label: '时间戳',
    fields: [
      { key: 'createdAt', label: '创建时间' },
      { key: 'updatedAt', label: '更新时间' },
      { key: 'createdBy', label: '创建者' },
    ],
  },
} as const;

type CategoryFields = typeof EXPORT_FIELD_CATEGORIES[keyof typeof EXPORT_FIELD_CATEGORIES]['fields'];
type ExportField = CategoryFields[number];

export const EXPORT_FIELDS: ExportField[] = Object.values(EXPORT_FIELD_CATEGORIES).flatMap((cat) => [...cat.fields]);

export type ExportFieldKey = ExportField['key'];

// ========== Export Presets ==========

export const EXPORT_PRESETS = [
  {
    id: 'basic',
    name: '基础导出',
    description: '短码、链接、标题、点击数',
    fields: ['shortCode', 'originalUrl', 'title', 'totalClicks', 'createdAt'],
  },
  {
    id: 'marketing',
    name: '营销分析',
    description: '包含UTM参数和点击分析',
    fields: ['shortCode', 'originalUrl', 'title', 'tags', 'totalClicks', 'uniqueClicks', 'utmSource', 'utmMedium', 'utmCampaign', 'createdAt'],
  },
  {
    id: 'full',
    name: '完整导出',
    description: '所有可用字段',
    fields: EXPORT_FIELDS.map((f) => f.key) as unknown as readonly ExportFieldKey[],
  },
  {
    id: 'migration',
    name: '迁移备份',
    description: '用于数据迁移的完整备份',
    fields: ['id', 'shortCode', 'originalUrl', 'title', 'description', 'tags', 'folderId', 'status', 'expiresAt', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm', 'createdAt', 'updatedAt'],
  },
] as const;

export type ExportPresetId = (typeof EXPORT_PRESETS)[number]['id'];
