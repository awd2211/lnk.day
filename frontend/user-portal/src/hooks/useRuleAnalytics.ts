import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ========== Types ==========

export type RuleType = 'geo' | 'device' | 'time' | 'language' | 'referrer' | 'query_param';

export interface RulePerformanceMetric {
  ruleId: string;
  ruleName: string;
  ruleTypes: RuleType[];
  targetUrl: string;
  enabled: boolean;
  priority: number;
  matchCount: number;
  matchRate: number;
  lastMatchedAt?: string;
  createdAt: string;
  daysActive: number;
  avgMatchesPerDay: number;
  effectiveness: 'high' | 'medium' | 'low' | 'inactive';
}

export interface ConditionCoverage {
  hasGeoTargeting: boolean;
  hasDeviceTargeting: boolean;
  hasTimeTargeting: boolean;
  hasLanguageTargeting: boolean;
  hasReferrerTargeting: boolean;
  hasQueryParamTargeting: boolean;
  countriesCovered: string[];
  devicesCovered: string[];
  languagesCovered: string[];
}

export interface RuleInsight {
  type: 'info' | 'warning' | 'suggestion';
  title: string;
  description: string;
  recommendations: string[];
}

export interface RuleAnalyticsResult {
  summary: {
    totalRules: number;
    enabledRules: number;
    activeRules: number;
    totalMatches: number;
    avgMatchesPerRule: number;
    rulesWithNoMatches: number;
    dateRange: { start: string; end: string };
  };
  rulePerformance: RulePerformanceMetric[];
  typeDistribution: Record<string, { count: number; percentage: number; totalMatches: number }>;
  topPerforming: RulePerformanceMetric[];
  underperforming: RulePerformanceMetric[];
  conditionCoverage: ConditionCoverage;
  insights: RuleInsight[];
}

export interface RuleMatchHistory {
  ruleId: string;
  ruleName: string;
  period: { days: number };
  totalMatches: number;
  dailyMatches: Array<{ date: string; matches: number }>;
  trend: { direction: 'up' | 'down' | 'stable'; percentage: number };
}

export interface RulePerformanceComparison {
  period1: { start: string; end: string };
  period2: { start: string; end: string };
  comparison: {
    totalMatchesChange: number;
    activeRulesChange: number;
    avgMatchesPerRuleChange: number;
  };
  topChanges: Array<{
    ruleId: string;
    ruleName: string;
    period1Matches: number;
    period2Matches: number;
    changePercentage: number;
  }>;
}

// ========== Hooks ==========

/**
 * Get comprehensive rule analytics for a link
 */
export function useRuleAnalytics(
  linkId: string,
  options?: {
    startDate?: string;
    endDate?: string;
  },
) {
  return useQuery({
    queryKey: ['rule-analytics', linkId, options],
    queryFn: async () => {
      const { data } = await api.get<RuleAnalyticsResult>(
        `/links/${linkId}/redirect-rules/analytics`,
        {
          params: {
            startDate: options?.startDate,
            endDate: options?.endDate,
          },
        },
      );
      return data;
    },
    enabled: !!linkId,
  });
}

/**
 * Get basic stats for a link's rules
 */
export function useRuleStats(linkId: string) {
  return useQuery({
    queryKey: ['rule-stats', linkId],
    queryFn: async () => {
      const { data } = await api.get<{
        totalRules: number;
        enabledRules: number;
        totalMatches: number;
        ruleStats: Array<{
          id: string;
          name: string;
          matchCount: number;
          lastMatchedAt?: string;
        }>;
      }>(`/links/${linkId}/redirect-rules/stats`);
      return data;
    },
    enabled: !!linkId,
  });
}

/**
 * Get rule match history for trending
 */
export function useRuleMatchHistory(ruleId: string, days: number = 30) {
  return useQuery({
    queryKey: ['rule-history', ruleId, days],
    queryFn: async () => {
      const { data } = await api.get<RuleMatchHistory>(
        `/redirect-rules/${ruleId}/history`,
        {
          params: { days },
        },
      );
      return data;
    },
    enabled: !!ruleId,
  });
}

/**
 * Compare rule performance across time periods
 */
export function useCompareRulePerformance() {
  return useMutation({
    mutationFn: async ({
      linkId,
      period1Start,
      period1End,
      period2Start,
      period2End,
    }: {
      linkId: string;
      period1Start: string;
      period1End: string;
      period2Start: string;
      period2End: string;
    }) => {
      const { data } = await api.post<RulePerformanceComparison>(
        `/links/${linkId}/redirect-rules/compare`,
        {
          period1Start,
          period1End,
          period2Start,
          period2End,
        },
      );
      return data;
    },
  });
}

/**
 * Get all rules for a link with performance data
 */
export function useRulesWithPerformance(linkId: string) {
  return useQuery({
    queryKey: ['rules-performance', linkId],
    queryFn: async () => {
      const [rulesResponse, analyticsResponse] = await Promise.all([
        api.get(`/links/${linkId}/redirect-rules`),
        api.get<RuleAnalyticsResult>(`/links/${linkId}/redirect-rules/analytics`),
      ]);

      // Merge rule data with performance metrics
      const rules = rulesResponse.data.rules || [];
      const performance = analyticsResponse.data.rulePerformance || [];

      return rules.map((rule: any) => {
        const perf = performance.find((p) => p.ruleId === rule.id);
        return {
          ...rule,
          performance: perf || null,
        };
      });
    },
    enabled: !!linkId,
  });
}

// ========== Helper Functions ==========

/**
 * Get effectiveness badge color
 */
export function getEffectivenessColor(effectiveness: string): string {
  switch (effectiveness) {
    case 'high':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'low':
      return 'text-orange-600 bg-orange-100';
    case 'inactive':
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get effectiveness label
 */
export function getEffectivenessLabel(effectiveness: string): string {
  switch (effectiveness) {
    case 'high':
      return '高效';
    case 'medium':
      return '中等';
    case 'low':
      return '低效';
    case 'inactive':
    default:
      return '未激活';
  }
}

/**
 * Get trend icon and color
 */
export function getTrendDisplay(direction: 'up' | 'down' | 'stable', percentage: number): {
  icon: string;
  color: string;
  label: string;
} {
  switch (direction) {
    case 'up':
      return {
        icon: '↑',
        color: 'text-green-600',
        label: `+${percentage}%`,
      };
    case 'down':
      return {
        icon: '↓',
        color: 'text-red-600',
        label: `-${percentage}%`,
      };
    case 'stable':
    default:
      return {
        icon: '→',
        color: 'text-gray-600',
        label: '稳定',
      };
  }
}

/**
 * Get rule type label
 */
export function getRuleTypeLabel(type: RuleType): string {
  const labels: Record<RuleType, string> = {
    geo: '地理位置',
    device: '设备类型',
    time: '时间段',
    language: '语言',
    referrer: '来源网站',
    query_param: 'URL参数',
  };
  return labels[type] || type;
}

/**
 * Get rule type color
 */
export function getRuleTypeColor(type: RuleType): string {
  const colors: Record<RuleType, string> = {
    geo: 'bg-blue-100 text-blue-700',
    device: 'bg-purple-100 text-purple-700',
    time: 'bg-orange-100 text-orange-700',
    language: 'bg-green-100 text-green-700',
    referrer: 'bg-pink-100 text-pink-700',
    query_param: 'bg-cyan-100 text-cyan-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}

/**
 * Get insight severity color
 */
export function getInsightColor(type: string): string {
  switch (type) {
    case 'warning':
      return 'border-yellow-500 bg-yellow-50';
    case 'suggestion':
      return 'border-blue-500 bg-blue-50';
    case 'info':
    default:
      return 'border-gray-500 bg-gray-50';
  }
}

/**
 * Format match count
 */
export function formatMatchCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
