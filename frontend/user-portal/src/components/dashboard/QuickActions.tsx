import { Link2, QrCode, FileImage, Target, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FloatingCard, FloatingCardHeader, FloatingCardContent } from '@/components/shared/FloatingCard';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'link',
    title: '新建链接',
    description: '创建短链接',
    icon: Link2,
    href: '/links?action=create',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'qr',
    title: '生成 QR 码',
    description: '为链接生成二维码',
    icon: QrCode,
    href: '/qr-codes?action=create',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'page',
    title: '创建落地页',
    description: 'Bio Link 页面',
    icon: FileImage,
    href: '/pages?action=create',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  {
    id: 'campaign',
    title: '新建活动',
    description: '营销活动追踪',
    icon: Target,
    href: '/campaigns?action=create',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  {
    id: 'deeplink',
    title: '深度链接',
    description: '移动端智能跳转',
    icon: Smartphone,
    href: '/deeplinks?action=create',
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <FloatingCard hover={false}>
      <FloatingCardHeader title="快速操作" description="常用功能快捷入口" />
      <FloatingCardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="ghost"
                className="h-auto flex-col gap-2 p-4 hover:bg-accent"
                onClick={() => navigate(action.href)}
              >
                <div className={`rounded-lg p-2 ${action.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {action.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </FloatingCardContent>
    </FloatingCard>
  );
}
