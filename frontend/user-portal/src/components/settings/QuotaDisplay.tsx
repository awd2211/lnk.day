import { useQuery } from '@tanstack/react-query';
import { Link2, MousePointerClick, QrCode, Zap, Loader2, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { quotaService } from '@/lib/api';

interface QuotaUsage {
  links: { used: number; limit: number };
  clicks: { used: number; limit: number };
  qrCodes: { used: number; limit: number };
  apiRequests: { used: number; limit: number };
  customDomains: { used: number; limit: number };
  teamMembers: { used: number; limit: number };
}

export function QuotaDisplay() {
  const navigate = useNavigate();

  const { data: quota, isLoading } = useQuery({
    queryKey: ['quota', 'usage'],
    queryFn: async () => {
      const { data } = await quotaService.getUsage();
      return data as QuotaUsage;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!quota) {
    return null;
  }

  const quotaItems = [
    {
      key: 'links',
      label: '链接数量',
      icon: Link2,
      used: quota.links.used,
      limit: quota.links.limit,
      color: 'bg-blue-500',
    },
    {
      key: 'clicks',
      label: '月点击量',
      icon: MousePointerClick,
      used: quota.clicks.used,
      limit: quota.clicks.limit,
      color: 'bg-green-500',
    },
    {
      key: 'qrCodes',
      label: '二维码',
      icon: QrCode,
      used: quota.qrCodes.used,
      limit: quota.qrCodes.limit,
      color: 'bg-purple-500',
    },
    {
      key: 'apiRequests',
      label: 'API 请求/日',
      icon: Zap,
      used: quota.apiRequests.used,
      limit: quota.apiRequests.limit,
      color: 'bg-orange-500',
    },
  ];

  const getPercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatNumber = (num: number) => {
    if (num === -1) return '无限';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const isNearLimit = (used: number, limit: number) => {
    if (limit === -1) return false;
    return used / limit >= 0.8;
  };

  const isAtLimit = (used: number, limit: number) => {
    if (limit === -1) return false;
    return used >= limit;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold dark:text-white">使用配额</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            查看您当前套餐的资源使用情况
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/billing')}>
          <TrendingUp className="mr-2 h-4 w-4" />
          升级套餐
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {quotaItems.map((item) => {
          const Icon = item.icon;
          const percentage = getPercentage(item.used, item.limit);
          const nearLimit = isNearLimit(item.used, item.limit);
          const atLimit = isAtLimit(item.used, item.limit);

          return (
            <div
              key={item.key}
              className={`rounded-lg border p-4 dark:border-gray-700 ${
                atLimit
                  ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  : nearLimit
                    ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                    : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    atLimit
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : nearLimit
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      atLimit
                        ? 'text-red-600 dark:text-red-400'
                        : nearLimit
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-600 dark:text-gray-300'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{item.label}</span>
                    <span
                      className={`text-sm ${
                        atLimit
                          ? 'font-semibold text-red-600 dark:text-red-400'
                          : nearLimit
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatNumber(item.used)} / {formatNumber(item.limit)}
                    </span>
                  </div>
                  <Progress
                    value={item.limit === -1 ? 0 : percentage}
                    className={`mt-2 h-2 ${
                      atLimit
                        ? '[&>div]:bg-red-500'
                        : nearLimit
                          ? '[&>div]:bg-yellow-500'
                          : `[&>div]:${item.color}`
                    }`}
                  />
                </div>
              </div>
              {atLimit && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  已达到限制，请升级套餐以继续使用
                </p>
              )}
              {nearLimit && !atLimit && (
                <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                  即将达到限制 ({percentage.toFixed(0)}%)
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional quotas */}
      <div className="rounded-lg border p-4 dark:border-gray-700">
        <h4 className="mb-3 text-sm font-medium dark:text-white">其他配额</h4>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">自定义域名</span>
            <span className="font-medium dark:text-white">
              {quota.customDomains.used} / {formatNumber(quota.customDomains.limit)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">团队成员</span>
            <span className="font-medium dark:text-white">
              {quota.teamMembers.used} / {formatNumber(quota.teamMembers.limit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
