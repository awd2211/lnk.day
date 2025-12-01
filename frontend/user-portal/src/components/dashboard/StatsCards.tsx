import { Link2, MousePointerClick, TrendingUp, Activity } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { FloatingCard } from '@/components/shared/FloatingCard';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, change, icon: Icon, description }: StatCardProps) {
  return (
    <FloatingCard>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p
                className={cn(
                  'text-xs flex items-center gap-1',
                  change.trend === 'up' && 'text-green-600 dark:text-green-400',
                  change.trend === 'down' && 'text-red-600 dark:text-red-400',
                  change.trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {change.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {change.trend === 'down' && (
                  <TrendingUp className="h-3 w-3 rotate-180" />
                )}
                <span>
                  {change.value > 0 ? '+' : ''}
                  {change.value}% 较上周
                </span>
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </FloatingCard>
  );
}

interface StatsCardsProps {
  stats?: {
    totalLinks: number;
    totalClicks: number;
    activeLinks: number;
    clicksToday: number;
    linksChange?: number;
    clicksChange?: number;
  };
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <FloatingCard key={i} hover={false}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-8 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </CardContent>
          </FloatingCard>
        ))}
      </div>
    );
  }

  const defaultStats = {
    totalLinks: stats?.totalLinks ?? 0,
    totalClicks: stats?.totalClicks ?? 0,
    activeLinks: stats?.activeLinks ?? 0,
    clicksToday: stats?.clicksToday ?? 0,
    linksChange: stats?.linksChange,
    clicksChange: stats?.clicksChange,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="总链接数"
        value={defaultStats.totalLinks.toLocaleString()}
        icon={Link2}
        change={
          defaultStats.linksChange !== undefined
            ? {
                value: defaultStats.linksChange,
                trend:
                  defaultStats.linksChange > 0
                    ? 'up'
                    : defaultStats.linksChange < 0
                    ? 'down'
                    : 'neutral',
              }
            : undefined
        }
      />
      <StatCard
        title="总点击量"
        value={defaultStats.totalClicks.toLocaleString()}
        icon={MousePointerClick}
        change={
          defaultStats.clicksChange !== undefined
            ? {
                value: defaultStats.clicksChange,
                trend:
                  defaultStats.clicksChange > 0
                    ? 'up'
                    : defaultStats.clicksChange < 0
                    ? 'down'
                    : 'neutral',
              }
            : undefined
        }
      />
      <StatCard
        title="活跃链接"
        value={defaultStats.activeLinks.toLocaleString()}
        icon={Activity}
        description="过去30天有访问"
      />
      <StatCard
        title="今日点击"
        value={defaultStats.clicksToday.toLocaleString()}
        icon={TrendingUp}
        description="实时统计"
      />
    </div>
  );
}
