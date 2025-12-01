import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function FloatingCard({ children, className, hover = true }: FloatingCardProps) {
  return (
    <Card
      className={cn(
        'shadow-sm border',
        hover && 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </Card>
  );
}

interface FloatingCardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function FloatingCardHeader({
  title,
  description,
  action,
  className,
}: FloatingCardHeaderProps) {
  return (
    <CardHeader className={cn('flex flex-row items-center justify-between space-y-0 pb-2', className)}>
      <div className="space-y-1">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </div>
      {action}
    </CardHeader>
  );
}

export { CardContent as FloatingCardContent };
