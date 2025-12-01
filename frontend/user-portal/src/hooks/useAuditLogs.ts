import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  userName?: string;
  action: string;
  actionLabel: string;
  resourceType: 'link' | 'qr_code' | 'page' | 'campaign' | 'team' | 'user' | 'domain' | 'api_key' | 'webhook' | 'billing' | 'settings';
  resourceId?: string;
  resourceName?: string;
  ipAddress: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
  };
  details?: Record<string, any>;
  status: 'success' | 'failure';
  severity: 'info' | 'warning' | 'critical';
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  severity?: string;
  search?: string;
}

export interface AuditLogStats {
  totalLogs: number;
  todayLogs: number;
  failedActions: number;
  criticalEvents: number;
  topActions: { action: string; count: number }[];
  topUsers: { userId: string; userName: string; count: number }[];
  activityByHour: { hour: number; count: number }[];
}

export function useAuditLogs(filters: AuditLogFilters = {}, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['audit-logs', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));

      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get<{
        data: AuditLog[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/v1/audit/logs?${params.toString()}`);
      return response.data;
    },
  });
}

export function useAuditLogStats(days: number = 7) {
  return useQuery({
    queryKey: ['audit-logs', 'stats', days],
    queryFn: async () => {
      const response = await api.get<AuditLogStats>(`/api/v1/audit/stats?days=${days}`);
      return response.data;
    },
  });
}

export function useLoginHistory(userId?: string) {
  return useQuery({
    queryKey: ['audit-logs', 'logins', userId],
    queryFn: async () => {
      // 使用审计日志查询接口过滤登录相关操作
      const params = new URLSearchParams();
      params.append('action', 'user.login');
      if (userId) params.append('userId', userId);
      params.append('limit', '50');
      const response = await api.get<{
        data: AuditLog[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/v1/audit/logs?${params.toString()}`);
      return response.data.data;
    },
  });
}

export function useAuditLogActions() {
  return useQuery({
    queryKey: ['audit-logs', 'actions'],
    queryFn: async () => {
      const response = await api.get<{ actions: string[] }>('/api/v1/audit/action-types');
      // 将后端返回的 action 字符串数组转换为前端期望的格式
      return response.data.actions.map((action: string) => ({
        action,
        label: actionLabels[action] || action,
        category: action.split('.')[0] || 'other',
      }));
    },
  });
}

// 操作类型映射
export const actionLabels: Record<string, string> = {
  'user.login': '用户登录',
  'user.logout': '用户登出',
  'user.login_failed': '登录失败',
  'user.password_changed': '密码修改',
  'user.2fa_enabled': '启用两步验证',
  'user.2fa_disabled': '禁用两步验证',
  'link.created': '创建链接',
  'link.updated': '更新链接',
  'link.deleted': '删除链接',
  'link.archived': '归档链接',
  'qr.created': '创建二维码',
  'qr.updated': '更新二维码',
  'qr.deleted': '删除二维码',
  'page.created': '创建页面',
  'page.updated': '更新页面',
  'page.deleted': '删除页面',
  'page.published': '发布页面',
  'campaign.created': '创建活动',
  'campaign.updated': '更新活动',
  'campaign.deleted': '删除活动',
  'campaign.started': '启动活动',
  'campaign.paused': '暂停活动',
  'team.member_invited': '邀请成员',
  'team.member_removed': '移除成员',
  'team.role_changed': '权限变更',
  'domain.added': '添加域名',
  'domain.verified': '验证域名',
  'domain.removed': '移除域名',
  'api_key.created': 'API密钥创建',
  'api_key.revoked': 'API密钥撤销',
  'webhook.created': '创建Webhook',
  'webhook.deleted': '删除Webhook',
  'billing.plan_changed': '套餐变更',
  'billing.payment_success': '支付成功',
  'billing.payment_failed': '支付失败',
  'settings.updated': '设置更新',
  'sso.configured': 'SSO配置',
  'export.requested': '数据导出请求',
  'deletion.requested': '数据删除请求',
};

export const resourceTypeLabels: Record<string, string> = {
  link: '链接',
  qr_code: '二维码',
  page: '页面',
  campaign: '活动',
  team: '团队',
  user: '用户',
  domain: '域名',
  api_key: 'API密钥',
  webhook: 'Webhook',
  billing: '计费',
  settings: '设置',
};

export const severityLabels: Record<string, { label: string; color: string }> = {
  info: { label: '信息', color: 'blue' },
  warning: { label: '警告', color: 'yellow' },
  critical: { label: '严重', color: 'red' },
};
