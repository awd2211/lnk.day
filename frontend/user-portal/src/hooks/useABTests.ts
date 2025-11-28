import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { abTestService } from '@/lib/api';

// Types
export interface ABTestVariant {
  id: string;
  name: string;
  url: string;
  weight: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

export interface ABTest {
  id: string;
  name: string;
  linkId: string;
  linkShortCode: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABTestVariant[];
  targetMetric: string;
  winnerId?: string;
  winnerName?: string;
  totalClicks: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABTestStats {
  testId: string;
  totalClicks: number;
  totalConversions: number;
  overallConversionRate: number;
  variants: Array<{
    id: string;
    name: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
    improvement: number; // vs control
    isControl: boolean;
  }>;
  significance: {
    isSignificant: boolean;
    confidence: number; // 0-100
    pValue: number;
    sampleSizeRequired: number;
    currentSampleSize: number;
  };
  recommendation?: {
    action: 'continue' | 'winner_found' | 'no_difference';
    winnerId?: string;
    message: string;
  };
}

export interface ABTestQueryParams {
  page?: number;
  limit?: number;
  status?: string;
}

// Hooks
export function useABTests(params?: ABTestQueryParams) {
  return useQuery({
    queryKey: ['ab-tests', params],
    queryFn: async () => {
      const { data } = await abTestService.getAll(params);
      return data as { items: ABTest[]; total: number; page: number; limit: number };
    },
  });
}

export function useABTest(id: string) {
  return useQuery({
    queryKey: ['ab-tests', id],
    queryFn: async () => {
      const { data } = await abTestService.getOne(id);
      return data as ABTest;
    },
    enabled: !!id,
  });
}

export function useABTestStats(id: string) {
  return useQuery({
    queryKey: ['ab-tests', id, 'stats'],
    queryFn: async () => {
      const { data } = await abTestService.getStats(id);
      return data as ABTestStats;
    },
    enabled: !!id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useABTestComparison(id: string) {
  return useQuery({
    queryKey: ['ab-tests', id, 'comparison'],
    queryFn: async () => {
      const { data } = await abTestService.getComparison(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      linkId: string;
      variants: Array<{ name: string; url: string; weight: number }>;
      targetMetric?: string;
    }) => abTestService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
    },
  });
}

export function useUpdateABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => abTestService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['ab-tests', id] });
    },
  });
}

export function useDeleteABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => abTestService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
    },
  });
}

export function useStartABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => abTestService.start(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['ab-tests', id] });
    },
  });
}

export function usePauseABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => abTestService.pause(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['ab-tests', id] });
    },
  });
}

export function useCompleteABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, winnerId }: { id: string; winnerId?: string }) =>
      abTestService.complete(id, winnerId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['ab-tests', id] });
    },
  });
}
