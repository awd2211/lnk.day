import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { linkSecurityService } from '@/lib/api';

export type SecurityRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'unknown';

export interface SecurityThreat {
  type: string;
  severity: SecurityRiskLevel;
  description: string;
  details?: Record<string, any>;
}

export interface SecurityScanResult {
  url: string;
  riskLevel: SecurityRiskLevel;
  score: number; // 0-100, higher is safer
  threats: SecurityThreat[];
  categories: string[];
  isPhishing: boolean;
  isMalware: boolean;
  isSpam: boolean;
  sslValid: boolean;
  domainAge?: number; // days
  scanDate: string;
  provider: string;
}

export interface SecurityStats {
  totalScans: number;
  safeLinks: number;
  riskyLinks: number;
  blockedLinks: number;
  recentThreats: Array<{
    url: string;
    riskLevel: SecurityRiskLevel;
    detectedAt: string;
  }>;
}

// Query: Analyze URL security
export function useSecurityAnalysis(url: string | null) {
  return useQuery({
    queryKey: ['security', 'analyze', url],
    queryFn: async () => {
      if (!url) return null;
      const { data } = await linkSecurityService.analyze(url);
      return data as SecurityScanResult;
    },
    enabled: !!url,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Query: Quick check URL
export function useSecurityQuickCheck(url: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['security', 'quick-check', url],
    queryFn: async () => {
      if (!url) return null;
      const { data } = await linkSecurityService.quickCheck(url);
      return data as { riskLevel: SecurityRiskLevel; score: number };
    },
    enabled: options?.enabled !== false && !!url,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Query: Get scan history for URL
export function useSecurityHistory(url: string | null, limit?: number) {
  return useQuery({
    queryKey: ['security', 'history', url, limit],
    queryFn: async () => {
      if (!url) return [];
      const { data } = await linkSecurityService.getScanHistory(url, limit);
      return data as SecurityScanResult[];
    },
    enabled: !!url,
  });
}

// Query: Get security stats
export function useSecurityStats() {
  return useQuery({
    queryKey: ['security', 'stats'],
    queryFn: async () => {
      const { data } = await linkSecurityService.getStats();
      return data as SecurityStats;
    },
  });
}

// Mutation: Analyze URL
export function useAnalyzeUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      const { data } = await linkSecurityService.analyze(url);
      return data as SecurityScanResult;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['security', 'analyze', result.url], result);
    },
  });
}

// Mutation: Batch scan URLs
export function useBatchSecurityScan() {
  return useMutation({
    mutationFn: async (urls: string[]) => {
      const { data } = await linkSecurityService.batchScan(urls);
      return data as SecurityScanResult[];
    },
  });
}

// Risk level colors and labels
export const RISK_LEVEL_CONFIG: Record<
  SecurityRiskLevel,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  safe: {
    label: '安全',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'shield-check',
  },
  low: {
    label: '低风险',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'shield',
  },
  medium: {
    label: '中风险',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: 'alert-triangle',
  },
  high: {
    label: '高风险',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: 'alert-octagon',
  },
  critical: {
    label: '危险',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'skull',
  },
  unknown: {
    label: '未知',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: 'help-circle',
  },
};

// Get risk level from score
export function getRiskLevelFromScore(score: number): SecurityRiskLevel {
  if (score >= 90) return 'safe';
  if (score >= 70) return 'low';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'high';
  if (score >= 0) return 'critical';
  return 'unknown';
}

// ========== Suspended Links Types ==========

export interface SuspendedLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  domain: string;
  teamId: string;
  status: 'SUSPENDED';
  updatedAt: string;
}

export interface ReputationCategory {
  score: number;
  category: 'trusted' | 'safe' | 'suspicious' | 'malicious' | 'unknown';
}

// ========== Suspended Links Hooks ==========

/**
 * Get suspended links
 */
export function useSuspendedLinks(options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['security', 'suspended-links', options],
    queryFn: async () => {
      const { data } = await linkSecurityService.getSuspendedLinks(options);
      return data as { links: SuspendedLink[]; total: number };
    },
  });
}

/**
 * Reinstate a suspended link
 */
export function useReinstateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, reason }: { linkId: string; reason: string }) => {
      const { data } = await linkSecurityService.reinstateLink(linkId, reason);
      return data as SuspendedLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'suspended-links'] });
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/**
 * Manual URL check and handle
 */
export function useCheckAndHandleUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      const { data } = await linkSecurityService.checkAndHandle(url);
      return data as {
        analysis: SecurityScanResult;
        actions?: string[];
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security'] });
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

// ========== Reputation Helpers ==========

export const REPUTATION_CATEGORY_CONFIG = {
  trusted: {
    label: '可信',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  safe: {
    label: '安全',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  suspicious: {
    label: '可疑',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  malicious: {
    label: '恶意',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  unknown: {
    label: '未知',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
} as const;

/**
 * Get reputation category from score
 */
export function getReputationCategory(score: number): ReputationCategory['category'] {
  if (score >= 80) return 'trusted';
  if (score >= 60) return 'safe';
  if (score >= 40) return 'suspicious';
  if (score >= 20) return 'malicious';
  return 'malicious';
}

/**
 * Calculate safety percentage from stats
 */
export function calculateSafetyPercentage(stats: SecurityStats): number {
  if (stats.totalScans === 0) return 100;
  return Math.round((stats.safeLinks / stats.totalScans) * 100);
}
