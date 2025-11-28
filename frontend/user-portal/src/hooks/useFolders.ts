import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { folderService } from '@/lib/api';

export interface Folder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  parentId?: string;
  teamId: string;
  linkCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
}

export interface CreateFolderData {
  name: string;
  color?: string;
  icon?: string;
  parentId?: string;
}

export interface UpdateFolderData {
  name?: string;
  color?: string;
  icon?: string;
}

// Query: Get all folders
export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data } = await folderService.getAll();
      return data as Folder[];
    },
  });
}

// Query: Get folder tree
export function useFolderTree() {
  return useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: async () => {
      const { data } = await folderService.getTree();
      return data as Folder[];
    },
  });
}

// Query: Get single folder
export function useFolder(id: string | null) {
  return useQuery({
    queryKey: ['folders', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await folderService.getOne(id);
      return data as Folder;
    },
    enabled: !!id,
  });
}

// Mutation: Create folder
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFolderData) => {
      const response = await folderService.create(data);
      return response.data as Folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

// Mutation: Update folder
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFolderData }) => {
      const response = await folderService.update(id, data);
      return response.data as Folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

// Mutation: Delete folder
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await folderService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

// Mutation: Reorder folders
export function useReorderFolders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await folderService.reorder(orderedIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

// Folder colors for UI
export const FOLDER_COLORS = [
  { name: '默认', value: '#6b7280' },
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '黄色', value: '#eab308' },
  { name: '绿色', value: '#22c55e' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '粉色', value: '#ec4899' },
];

// Folder icons
export const FOLDER_ICONS = [
  'folder',
  'folder-open',
  'briefcase',
  'shopping-bag',
  'heart',
  'star',
  'bookmark',
  'tag',
  'globe',
  'zap',
  'coffee',
  'music',
  'video',
  'image',
  'file-text',
  'mail',
];
