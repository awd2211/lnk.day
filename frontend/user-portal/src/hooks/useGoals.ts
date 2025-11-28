import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Goal {
  id: string;
  name: string;
  description?: string;
  campaignId?: string;
  campaignName?: string;
  type: 'clicks' | 'conversions' | 'revenue' | 'signups' | 'purchases' | 'custom';
  targetValue: number;
  currentValue: number;
  progress: number; // 0-100
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'failed' | 'paused';
  notifyOnComplete: boolean;
  notifyOnMilestone: boolean;
  milestones: number[]; // [25, 50, 75, 100]
  reachedMilestones: number[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  failedGoals: number;
  averageProgress: number;
  upcomingDeadlines: Goal[];
}

export interface CreateGoalDto {
  name: string;
  description?: string;
  campaignId?: string;
  type: Goal['type'];
  targetValue: number;
  startDate: string;
  endDate: string;
  notifyOnComplete?: boolean;
  notifyOnMilestone?: boolean;
  milestones?: number[];
}

export function useGoals(campaignId?: string) {
  return useQuery({
    queryKey: ['goals', { campaignId }],
    queryFn: async () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      const response = await api.get<Goal[]>(`/goals${params}`);
      return response.data;
    },
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goals', id],
    queryFn: async () => {
      const response = await api.get<Goal>(`/goals/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useGoalStats() {
  return useQuery({
    queryKey: ['goals', 'stats'],
    queryFn: async () => {
      const response = await api.get<GoalStats>('/goals/stats');
      return response.data;
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGoalDto) => {
      const response = await api.post<Goal>('/goals', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateGoalDto> }) => {
      const response = await api.patch<Goal>(`/goals/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function usePauseGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Goal>(`/goals/${id}/pause`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useResumeGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Goal>(`/goals/${id}/resume`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useGoalHistory(id: string) {
  return useQuery({
    queryKey: ['goals', id, 'history'],
    queryFn: async () => {
      const response = await api.get<{ date: string; value: number }[]>(`/goals/${id}/history`);
      return response.data;
    },
    enabled: !!id,
  });
}
