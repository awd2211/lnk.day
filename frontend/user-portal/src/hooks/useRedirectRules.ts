import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { redirectRulesService } from '@/lib/api';

export type RuleConditionType =
  | 'country'
  | 'device'
  | 'browser'
  | 'os'
  | 'language'
  | 'time'
  | 'date'
  | 'referrer'
  | 'query_param'
  | 'cookie'
  | 'ip_range'
  | 'random';

export type RuleOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'regex' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'between';

export interface RuleCondition {
  type: RuleConditionType;
  operator: RuleOperator;
  value: string | string[] | number | { start: string | number; end: string | number };
  key?: string; // For query_param, cookie
}

export interface RedirectRule {
  id: string;
  linkId: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  conditionLogic: 'and' | 'or';
  targetUrl: string;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRedirectRuleData {
  name: string;
  description?: string;
  conditions: RuleCondition[];
  conditionLogic?: 'and' | 'or';
  targetUrl: string;
}

export interface UpdateRedirectRuleData extends Partial<CreateRedirectRuleData> {
  isActive?: boolean;
}

// Query: Get all rules for a link
export function useRedirectRules(linkId: string | null) {
  return useQuery({
    queryKey: ['redirect-rules', linkId],
    queryFn: async () => {
      if (!linkId) return [];
      const { data } = await redirectRulesService.getAll(linkId);
      return data as RedirectRule[];
    },
    enabled: !!linkId,
  });
}

// Query: Get single rule
export function useRedirectRule(id: string | null) {
  return useQuery({
    queryKey: ['redirect-rules', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await redirectRulesService.getOne(id);
      return data as RedirectRule;
    },
    enabled: !!id,
  });
}

// Query: Get rule stats for a link
export function useRedirectRuleStats(linkId: string | null) {
  return useQuery({
    queryKey: ['redirect-rules', linkId, 'stats'],
    queryFn: async () => {
      if (!linkId) return null;
      const { data } = await redirectRulesService.getStats(linkId);
      return data as {
        totalRules: number;
        activeRules: number;
        totalMatches: number;
        ruleStats: Array<{ ruleId: string; ruleName: string; matchCount: number; percentage: number }>;
      };
    },
    enabled: !!linkId,
  });
}

// Mutation: Create rule
export function useCreateRedirectRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, data }: { linkId: string; data: CreateRedirectRuleData }) => {
      const response = await redirectRulesService.create(linkId, data);
      return response.data as RedirectRule;
    },
    onSuccess: (_, { linkId }) => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rules', linkId] });
    },
  });
}

// Mutation: Update rule
export function useUpdateRedirectRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRedirectRuleData }) => {
      const response = await redirectRulesService.update(id, data);
      return response.data as RedirectRule;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rules', result.linkId] });
      queryClient.invalidateQueries({ queryKey: ['redirect-rules', 'detail', result.id] });
    },
  });
}

// Mutation: Delete rule
export function useDeleteRedirectRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, linkId }: { id: string; linkId: string }) => {
      await redirectRulesService.delete(id);
      return { linkId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rules', result.linkId] });
    },
  });
}

// Mutation: Toggle rule active state
export function useToggleRedirectRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, linkId }: { id: string; linkId: string }) => {
      const response = await redirectRulesService.toggle(id);
      return { ...response.data, linkId } as RedirectRule & { linkId: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rules', result.linkId] });
    },
  });
}

// Mutation: Reorder rules
export function useReorderRedirectRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, ruleIds }: { linkId: string; ruleIds: string[] }) => {
      await redirectRulesService.reorder(linkId, ruleIds);
    },
    onSuccess: (_, { linkId }) => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rules', linkId] });
    },
  });
}

// Condition type labels
export const CONDITION_TYPE_LABELS: Record<RuleConditionType, { label: string; description: string; icon: string }> = {
  country: { label: '国家/地区', description: '根据访问者的国家或地区', icon: 'globe' },
  device: { label: '设备类型', description: '根据设备类型（手机/平板/桌面）', icon: 'smartphone' },
  browser: { label: '浏览器', description: '根据使用的浏览器', icon: 'chrome' },
  os: { label: '操作系统', description: '根据操作系统类型', icon: 'monitor' },
  language: { label: '语言', description: '根据浏览器语言设置', icon: 'languages' },
  time: { label: '时间段', description: '根据访问时间', icon: 'clock' },
  date: { label: '日期范围', description: '根据访问日期', icon: 'calendar' },
  referrer: { label: '来源网站', description: '根据 HTTP Referer', icon: 'external-link' },
  query_param: { label: 'URL 参数', description: '根据 URL 查询参数', icon: 'search' },
  cookie: { label: 'Cookie', description: '根据 Cookie 值', icon: 'cookie' },
  ip_range: { label: 'IP 范围', description: '根据访问者 IP 地址', icon: 'network' },
  random: { label: '随机分流', description: '随机百分比分流（A/B测试）', icon: 'shuffle' },
};

// Operator labels
export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  equals: '等于',
  not_equals: '不等于',
  contains: '包含',
  not_contains: '不包含',
  starts_with: '开头是',
  ends_with: '结尾是',
  regex: '正则匹配',
  in: '在列表中',
  not_in: '不在列表中',
  greater_than: '大于',
  less_than: '小于',
  between: '介于',
};

// Common device values
export const DEVICE_VALUES = ['mobile', 'tablet', 'desktop'];

// Common browser values
export const BROWSER_VALUES = ['chrome', 'firefox', 'safari', 'edge', 'opera', 'ie'];

// Common OS values
export const OS_VALUES = ['windows', 'macos', 'linux', 'ios', 'android'];

// Country codes (subset)
export const COUNTRY_CODES = [
  { code: 'CN', name: '中国' },
  { code: 'US', name: '美国' },
  { code: 'JP', name: '日本' },
  { code: 'KR', name: '韩国' },
  { code: 'UK', name: '英国' },
  { code: 'DE', name: '德国' },
  { code: 'FR', name: '法国' },
  { code: 'AU', name: '澳大利亚' },
  { code: 'CA', name: '加拿大' },
  { code: 'SG', name: '新加坡' },
  { code: 'HK', name: '香港' },
  { code: 'TW', name: '台湾' },
];
