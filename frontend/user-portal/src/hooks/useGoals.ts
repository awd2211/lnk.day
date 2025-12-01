import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ========== Goal Types ==========

export type GoalType =
  | 'clicks'
  | 'conversions'
  | 'revenue'
  | 'unique_visitors'
  | 'ctr'
  | 'engagement_rate'
  | 'bounce_rate'
  | 'session_duration'
  | 'page_views'
  | 'form_submissions'
  | 'signups'
  | 'purchases'
  | 'average_order_value'
  | 'return_visitors'
  | 'social_shares'
  | 'custom';

export type GoalStatus = 'active' | 'reached' | 'failed' | 'paused' | 'completed';

export type AttributionModel = 'first_touch' | 'last_touch' | 'linear' | 'time_decay';

// ========== Interfaces ==========

export interface NotificationThreshold {
  percentage: number;
  notified: boolean;
  notifiedAt?: string;
}

export interface NotificationChannels {
  email?: string[];
  webhook?: string;
  slack?: {
    webhookUrl: string;
    channel?: string;
  };
  teams?: {
    webhookUrl: string;
  };
  sms?: string[];
}

export interface GoalMetadata {
  customMetric?: string;
  formula?: string;
  description?: string;
  linkedABTestId?: string;
  linkedVariantId?: string;
  compareWithGoalId?: string;
  benchmarkValue?: number;
  attributionModel?: AttributionModel;
  attributionWindow?: number;
  isInverse?: boolean;
  unitLabel?: string;
  decimalPlaces?: number;
}

export interface GoalHistory {
  timestamp: string;
  value: number;
  source?: string;
}

export interface GoalProjection {
  estimatedCompletionDate?: string;
  dailyRate?: number;
  weeklyTrend?: number;
  confidence?: number;
  lastCalculatedAt?: string;
}

export interface GoalMilestone {
  id: string;
  percentage: number;
  name?: string;
  reached: boolean;
  reachedAt?: string;
}

export interface Goal {
  id: string;
  campaignId: string;
  teamId: string;
  name: string;
  description?: string;
  type: GoalType;
  target: number;
  targetValue?: number; // Alias for target
  current: number;
  currentValue?: number; // Alias for current
  currency?: string;
  status: GoalStatus;
  thresholds: NotificationThreshold[];
  notifications: NotificationChannels;
  deadline?: string;
  endDate?: string; // Alias for deadline
  startDate?: string;
  enabled: boolean;
  metadata: GoalMetadata;
  history: GoalHistory[];
  projection?: GoalProjection;
  startValue?: number;
  baselineValue?: number;
  milestones?: GoalMilestone[];
  reachedMilestones?: number;
  createdAt: string;
  updatedAt: string;
  reachedAt?: string;
  // Computed fields
  progress?: number;
  campaignName?: string;
}

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  reachedGoals: number;
  failedGoals: number;
  pausedGoals: number;
  averageProgress: number;
  averageCompletionRate: number;
  upcomingDeadlines: Goal[];
  goalsByType: Record<GoalType, number>;
  recentActivity: Array<{
    goalId: string;
    goalName: string;
    event: 'created' | 'updated' | 'reached' | 'failed';
    timestamp: string;
  }>;
}

export interface GoalTrendPoint {
  date: string;
  value: number;
  progress: number;
  dailyChange: number;
}

export interface GoalComparisonResult {
  goal1: Goal;
  goal2: Goal;
  progressDifference: number;
  rateDifference: number;
  winner: 'goal1' | 'goal2' | 'tie';
}

export interface CreateGoalDto {
  name: string;
  campaignId: string;
  type: GoalType;
  target: number;
  currency?: string;
  deadline?: string;
  thresholds?: NotificationThreshold[];
  notifications?: NotificationChannels;
  metadata?: Partial<GoalMetadata>;
  startValue?: number;
  baselineValue?: number;
}

export interface UpdateGoalDto {
  name?: string;
  target?: number;
  currency?: string;
  deadline?: string;
  enabled?: boolean;
  thresholds?: NotificationThreshold[];
  notifications?: NotificationChannels;
  metadata?: Partial<GoalMetadata>;
}

export function useGoals(campaignId?: string) {
  return useQuery({
    queryKey: ['goals', { campaignId }],
    queryFn: async () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      const response = await api.get<Goal[]>(`/api/v1/goals${params}`);
      return response.data;
    },
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goals', id],
    queryFn: async () => {
      const response = await api.get<Goal>(`/api/v1/goals/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useGoalStats() {
  return useQuery({
    queryKey: ['goals', 'stats'],
    queryFn: async () => {
      const response = await api.get<GoalStats>('/api/v1/goals/stats');
      return response.data;
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGoalDto) => {
      const response = await api.post<Goal>('/api/v1/goals', data);
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
    mutationFn: async ({ id, data }: { id: string; data: UpdateGoalDto }) => {
      const response = await api.patch<Goal>(`/api/v1/goals/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals', id] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/goals/${id}`);
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
      const response = await api.post<Goal>(`/api/v1/goals/${id}/pause`);
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
      const response = await api.post<Goal>(`/api/v1/goals/${id}/resume`);
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
      const response = await api.get<GoalHistory[]>(`/api/v1/goals/${id}/history`);
      return response.data;
    },
    enabled: !!id,
  });
}

// ========== New Analytics Hooks ==========

/**
 * Get goal projection (estimated completion date, rate, trend)
 */
export function useGoalProjection(goalId: string) {
  return useQuery({
    queryKey: ['goals', goalId, 'projection'],
    queryFn: async () => {
      const response = await api.get<GoalProjection & { daysRemaining?: number }>(`/api/v1/goals/${goalId}/projection`);
      return response.data;
    },
    enabled: !!goalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get goal trends over time
 */
export function useGoalTrends(goalId: string, period: 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: ['goals', goalId, 'trends', period],
    queryFn: async () => {
      const response = await api.get<GoalTrendPoint[]>(`/api/v1/goals/${goalId}/trends?period=${period}`);
      return response.data;
    },
    enabled: !!goalId,
  });
}

/**
 * Compare two goals
 */
export function useCompareGoals(goalId1: string, goalId2: string) {
  return useQuery({
    queryKey: ['goals', 'compare', goalId1, goalId2],
    queryFn: async () => {
      const response = await api.get<GoalComparisonResult>(`/api/v1/goals/compare?goal1=${goalId1}&goal2=${goalId2}`);
      return response.data;
    },
    enabled: !!goalId1 && !!goalId2,
  });
}

/**
 * Get team-wide goal statistics
 */
export function useTeamGoalStats(teamId?: string) {
  return useQuery({
    queryKey: ['goals', 'team-stats', teamId],
    queryFn: async () => {
      const params = teamId ? `?teamId=${teamId}` : '';
      const response = await api.get<GoalStats>(`/api/v1/goals/team-stats${params}`);
      return response.data;
    },
  });
}

/**
 * Update goal progress manually
 */
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, value, source }: { goalId: string; value: number; source?: string }) => {
      const response = await api.post<Goal>(`/api/v1/goals/${goalId}/progress`, { value, source });
      return response.data;
    },
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals', goalId] });
    },
  });
}

/**
 * Recalculate goal projection
 */
export function useRecalculateProjection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const response = await api.post<GoalProjection>(`/api/v1/goals/${goalId}/projection/recalculate`);
      return response.data;
    },
    onSuccess: (_, goalId) => {
      queryClient.invalidateQueries({ queryKey: ['goals', goalId, 'projection'] });
    },
  });
}

// ========== Goal Type Configuration ==========

export interface GoalTypeConfig {
  label: string;
  description: string;
  unitLabel: string;
  icon: string;
  isInverse: boolean;
  decimalPlaces: number;
  category: 'traffic' | 'engagement' | 'conversion' | 'revenue' | 'custom';
}

export const GOAL_TYPE_CONFIG: Record<GoalType, GoalTypeConfig> = {
  clicks: {
    label: '点击量',
    description: '链接点击总次数',
    unitLabel: '次',
    icon: 'mouse-pointer-click',
    isInverse: false,
    decimalPlaces: 0,
    category: 'traffic',
  },
  unique_visitors: {
    label: '独立访客',
    description: '独立访客数量',
    unitLabel: '人',
    icon: 'users',
    isInverse: false,
    decimalPlaces: 0,
    category: 'traffic',
  },
  page_views: {
    label: '页面浏览',
    description: '页面浏览总次数',
    unitLabel: '次',
    icon: 'eye',
    isInverse: false,
    decimalPlaces: 0,
    category: 'traffic',
  },
  ctr: {
    label: '点击率',
    description: '点击次数/展示次数',
    unitLabel: '%',
    icon: 'percent',
    isInverse: false,
    decimalPlaces: 2,
    category: 'engagement',
  },
  engagement_rate: {
    label: '互动率',
    description: '用户互动比例',
    unitLabel: '%',
    icon: 'heart',
    isInverse: false,
    decimalPlaces: 2,
    category: 'engagement',
  },
  bounce_rate: {
    label: '跳出率',
    description: '单页访问比例（越低越好）',
    unitLabel: '%',
    icon: 'log-out',
    isInverse: true,
    decimalPlaces: 2,
    category: 'engagement',
  },
  session_duration: {
    label: '会话时长',
    description: '平均会话时间',
    unitLabel: '秒',
    icon: 'clock',
    isInverse: false,
    decimalPlaces: 0,
    category: 'engagement',
  },
  return_visitors: {
    label: '回访用户',
    description: '返回访问的用户数',
    unitLabel: '人',
    icon: 'repeat',
    isInverse: false,
    decimalPlaces: 0,
    category: 'engagement',
  },
  social_shares: {
    label: '社交分享',
    description: '社交媒体分享次数',
    unitLabel: '次',
    icon: 'share-2',
    isInverse: false,
    decimalPlaces: 0,
    category: 'engagement',
  },
  conversions: {
    label: '转化',
    description: '完成目标转化的次数',
    unitLabel: '次',
    icon: 'target',
    isInverse: false,
    decimalPlaces: 0,
    category: 'conversion',
  },
  form_submissions: {
    label: '表单提交',
    description: '表单提交次数',
    unitLabel: '次',
    icon: 'file-text',
    isInverse: false,
    decimalPlaces: 0,
    category: 'conversion',
  },
  signups: {
    label: '注册',
    description: '新用户注册数',
    unitLabel: '人',
    icon: 'user-plus',
    isInverse: false,
    decimalPlaces: 0,
    category: 'conversion',
  },
  purchases: {
    label: '购买',
    description: '完成购买的次数',
    unitLabel: '次',
    icon: 'shopping-cart',
    isInverse: false,
    decimalPlaces: 0,
    category: 'conversion',
  },
  revenue: {
    label: '收入',
    description: '总收入金额',
    unitLabel: '元',
    icon: 'dollar-sign',
    isInverse: false,
    decimalPlaces: 2,
    category: 'revenue',
  },
  average_order_value: {
    label: '平均订单金额',
    description: '每笔订单平均金额',
    unitLabel: '元',
    icon: 'trending-up',
    isInverse: false,
    decimalPlaces: 2,
    category: 'revenue',
  },
  custom: {
    label: '自定义',
    description: '自定义指标',
    unitLabel: '',
    icon: 'settings',
    isInverse: false,
    decimalPlaces: 2,
    category: 'custom',
  },
};

export const GOAL_CATEGORIES = {
  traffic: { label: '流量', icon: 'activity' },
  engagement: { label: '互动', icon: 'heart' },
  conversion: { label: '转化', icon: 'target' },
  revenue: { label: '收入', icon: 'dollar-sign' },
  custom: { label: '自定义', icon: 'settings' },
} as const;

// ========== Helper Functions ==========

/**
 * Get goal types by category
 */
export function getGoalTypesByCategory(category: GoalTypeConfig['category']): GoalType[] {
  return (Object.entries(GOAL_TYPE_CONFIG) as [GoalType, GoalTypeConfig][])
    .filter(([_, config]) => config.category === category)
    .map(([type]) => type);
}

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(goal: Goal): number {
  if (goal.target === 0) return 0;
  const progress = (goal.current / goal.target) * 100;
  // For inverse metrics, progress is measured by how much we've reduced
  if (goal.metadata.isInverse && goal.baselineValue) {
    const reduction = goal.baselineValue - goal.current;
    const targetReduction = goal.baselineValue - goal.target;
    return targetReduction > 0 ? (reduction / targetReduction) * 100 : 0;
  }
  return Math.min(progress, 100);
}

/**
 * Format goal value with unit
 */
export function formatGoalValue(value: number, type: GoalType, currency?: string): string {
  const config = GOAL_TYPE_CONFIG[type];
  const formatted = value.toFixed(config.decimalPlaces);

  if (type === 'revenue' || type === 'average_order_value') {
    return currency ? `${currency} ${formatted}` : `¥${formatted}`;
  }

  return config.unitLabel ? `${formatted}${config.unitLabel}` : formatted;
}

/**
 * Get status color and label
 */
export const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: '进行中', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  reached: { label: '已达成', color: 'text-green-600', bgColor: 'bg-green-100' },
  completed: { label: '已完成', color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { label: '未达成', color: 'text-red-600', bgColor: 'bg-red-100' },
  paused: { label: '已暂停', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

/**
 * Get projection confidence label
 */
export function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 80) return { label: '高', color: 'text-green-600' };
  if (confidence >= 50) return { label: '中', color: 'text-yellow-600' };
  return { label: '低', color: 'text-red-600' };
}

/**
 * Get days remaining until deadline
 */
export function getDaysRemaining(deadline?: string): number | null {
  if (!deadline) return null;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if goal is at risk (low confidence or deadline approaching)
 */
export function isGoalAtRisk(goal: Goal): boolean {
  const daysRemaining = getDaysRemaining(goal.deadline);
  const progress = calculateGoalProgress(goal);
  const expectedProgress = daysRemaining !== null && goal.deadline
    ? ((new Date().getTime() - new Date(goal.createdAt).getTime()) /
       (new Date(goal.deadline).getTime() - new Date(goal.createdAt).getTime())) * 100
    : null;

  // At risk if behind expected progress or low projection confidence
  if (expectedProgress !== null && progress < expectedProgress * 0.8) {
    return true;
  }
  if (goal.projection?.confidence && goal.projection.confidence < 50) {
    return true;
  }
  // At risk if deadline is within 7 days and less than 90% progress
  if (daysRemaining !== null && daysRemaining <= 7 && progress < 90) {
    return true;
  }
  return false;
}
