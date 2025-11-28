import { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  HelpCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Lock,
  Bug,
  Mail,
  Calendar,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSecurityQuickCheck,
  useAnalyzeUrl,
  SecurityRiskLevel,
  RISK_LEVEL_CONFIG,
} from '@/hooks/useSecurity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SecurityBadgeProps {
  url: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  autoCheck?: boolean;
}

const RiskIcon = ({
  riskLevel,
  className,
}: {
  riskLevel: SecurityRiskLevel;
  className?: string;
}) => {
  const iconClass = cn('h-4 w-4', className);

  switch (riskLevel) {
    case 'safe':
      return <ShieldCheck className={cn(iconClass, 'text-green-600')} />;
    case 'low':
      return <Shield className={cn(iconClass, 'text-blue-600')} />;
    case 'medium':
      return <AlertTriangle className={cn(iconClass, 'text-yellow-600')} />;
    case 'high':
      return <ShieldAlert className={cn(iconClass, 'text-orange-600')} />;
    case 'critical':
      return <ShieldX className={cn(iconClass, 'text-red-600')} />;
    default:
      return <HelpCircle className={cn(iconClass, 'text-gray-600')} />;
  }
};

export function SecurityBadge({
  url,
  showLabel = false,
  size = 'md',
  className,
  autoCheck = true,
}: SecurityBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: quickCheck, isLoading: isQuickChecking } = useSecurityQuickCheck(url, {
    enabled: autoCheck,
  });
  const analyzeUrl = useAnalyzeUrl();

  const riskLevel = quickCheck?.riskLevel || 'unknown';
  const score = quickCheck?.score;
  const config = RISK_LEVEL_CONFIG[riskLevel];

  const handleAnalyze = async () => {
    try {
      await analyzeUrl.mutateAsync(url);
    } catch {
      // Error is handled by the mutation's error state
    }
  };

  const sizeClasses = {
    sm: 'h-5 px-1.5 text-xs gap-1',
    md: 'h-6 px-2 text-xs gap-1.5',
    lg: 'h-7 px-2.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  if (isQuickChecking) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-gray-200 bg-gray-50',
          sizeClasses[size],
          className
        )}
      >
        <Loader2 className={cn(iconSizes[size], 'animate-spin text-gray-400')} />
        {showLabel && <span className="text-gray-500">检查中</span>}
      </Badge>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center rounded-full border transition-colors',
            config.bgColor,
            'border-current/20 hover:border-current/40',
            sizeClasses[size],
            className
          )}
        >
          <RiskIcon riskLevel={riskLevel} className={iconSizes[size]} />
          {showLabel && (
            <span className={config.color}>{config.label}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiskIcon riskLevel={riskLevel} />
              <span className={cn('font-medium', config.color)}>{config.label}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzeUrl.isPending}
            >
              {analyzeUrl.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Score */}
          {score !== undefined && (
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">安全评分</span>
                <span className="font-medium">{score}/100</span>
              </div>
              <Progress
                value={score}
                className={cn(
                  'h-2',
                  score >= 70 ? '[&>div]:bg-green-500' :
                  score >= 50 ? '[&>div]:bg-yellow-500' :
                  score >= 30 ? '[&>div]:bg-orange-500' :
                  '[&>div]:bg-red-500'
                )}
              />
            </div>
          )}

          {/* Analysis result */}
          {analyzeUrl.data && (
            <div className="space-y-3 border-t pt-3">
              {/* Threat indicators */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div
                  className={cn(
                    'rounded-lg p-2',
                    analyzeUrl.data.isPhishing ? 'bg-red-100' : 'bg-green-100'
                  )}
                >
                  <Mail
                    className={cn(
                      'mx-auto mb-1 h-4 w-4',
                      analyzeUrl.data.isPhishing ? 'text-red-600' : 'text-green-600'
                    )}
                  />
                  <p className="text-xs">钓鱼</p>
                </div>
                <div
                  className={cn(
                    'rounded-lg p-2',
                    analyzeUrl.data.isMalware ? 'bg-red-100' : 'bg-green-100'
                  )}
                >
                  <Bug
                    className={cn(
                      'mx-auto mb-1 h-4 w-4',
                      analyzeUrl.data.isMalware ? 'text-red-600' : 'text-green-600'
                    )}
                  />
                  <p className="text-xs">恶意软件</p>
                </div>
                <div
                  className={cn(
                    'rounded-lg p-2',
                    analyzeUrl.data.sslValid ? 'bg-green-100' : 'bg-yellow-100'
                  )}
                >
                  <Lock
                    className={cn(
                      'mx-auto mb-1 h-4 w-4',
                      analyzeUrl.data.sslValid ? 'text-green-600' : 'text-yellow-600'
                    )}
                  />
                  <p className="text-xs">SSL</p>
                </div>
              </div>

              {/* Threats list */}
              {analyzeUrl.data.threats.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    检测到的威胁
                  </p>
                  <ul className="space-y-1">
                    {analyzeUrl.data.threats.map((threat, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs"
                      >
                        <AlertTriangle
                          className={cn(
                            'mt-0.5 h-3 w-3 shrink-0',
                            threat.severity === 'critical' || threat.severity === 'high'
                              ? 'text-red-500'
                              : 'text-yellow-500'
                          )}
                        />
                        <span>{threat.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Domain info */}
              {analyzeUrl.data.domainAge !== undefined && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>域名年龄: {analyzeUrl.data.domainAge} 天</span>
                </div>
              )}

              {/* Scan info */}
              <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                <span>
                  扫描于{' '}
                  {format(new Date(analyzeUrl.data.scanDate), 'MM/dd HH:mm', {
                    locale: zhCN,
                  })}
                </span>
                <span>来源: {analyzeUrl.data.provider}</span>
              </div>
            </div>
          )}

          {/* URL preview */}
          <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs text-muted-foreground">{url}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Simple inline version for table cells
export function SecurityBadgeInline({
  riskLevel,
  score,
  size = 'sm',
  className,
}: {
  riskLevel: SecurityRiskLevel;
  score?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const config = RISK_LEVEL_CONFIG[riskLevel];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5',
              config.bgColor,
              size === 'sm' ? 'text-xs' : 'text-sm',
              className
            )}
          >
            <RiskIcon
              riskLevel={riskLevel}
              className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
            />
            {score !== undefined && (
              <span className={config.color}>{score}</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {config.label}
            {score !== undefined && ` (${score}/100)`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
