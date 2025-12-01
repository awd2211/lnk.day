import { Link2, ExternalLink, MousePointerClick } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FloatingCard, FloatingCardHeader, FloatingCardContent } from '@/components/shared/FloatingCard';
import { cn } from '@/lib/utils';

interface RecentLink {
  id: string;
  shortCode: string;
  title?: string;
  originalUrl: string;
  clicks: number;
  createdAt: string;
}

interface RecentActivityProps {
  links?: RecentLink[];
  isLoading?: boolean;
}

export function RecentActivity({ links, isLoading }: RecentActivityProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <FloatingCard hover={false}>
        <FloatingCardHeader title="最近创建" description="您最近创建的链接" />
        <FloatingCardContent className="pt-0">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        </FloatingCardContent>
      </FloatingCard>
    );
  }

  const recentLinks = links || [];

  return (
    <FloatingCard hover={false}>
      <FloatingCardHeader
        title="最近创建"
        description="您最近创建的链接"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/links">查看全部</Link>
          </Button>
        }
      />
      <FloatingCardContent className="pt-0">
        {recentLinks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无链接</p>
            <p className="text-sm">创建您的第一个短链接吧</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/links?action=create">创建链接</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {recentLinks.map((link) => (
              <Link
                key={link.id}
                to={`/links/${link.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      /{link.shortCode}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {link.title || truncateUrl(link.originalUrl)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MousePointerClick className="h-3 w-3" />
                    <span className="text-xs">{link.clicks}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(link.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </FloatingCardContent>
    </FloatingCard>
  );
}
