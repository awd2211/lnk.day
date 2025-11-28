import { ReactNode } from 'react';
import { LucideIcon, FileX, Search, Inbox, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-8 w-8',
      iconWrapper: 'h-12 w-12',
      title: 'text-sm',
      description: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'h-10 w-10',
      iconWrapper: 'h-16 w-16',
      title: 'text-base',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-12 w-12',
      iconWrapper: 'h-20 w-20',
      title: 'text-lg',
      description: 'text-base',
    },
  };

  const styles = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        styles.container,
        className
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-full bg-muted',
          styles.iconWrapper
        )}
      >
        <Icon className={cn('text-muted-foreground', styles.icon)} />
      </div>
      <h3 className={cn('font-medium text-foreground', styles.title)}>
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'mt-1 max-w-sm text-muted-foreground',
            styles.description
          )}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction || children) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoDataEmptyState({
  onAction,
  actionLabel = '开始创建',
  ...props
}: Partial<EmptyStateProps> & {
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <EmptyState
      icon={FileX}
      title="暂无数据"
      description="还没有任何数据，点击下方按钮开始创建"
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      {...props}
    />
  );
}

export function NoSearchResultsEmptyState({
  searchTerm,
  onClear,
  ...props
}: Partial<EmptyStateProps> & {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="未找到匹配结果"
      description={
        searchTerm
          ? `没有找到与 "${searchTerm}" 相关的内容`
          : '没有找到匹配的内容，请尝试其他搜索条件'
      }
      action={onClear ? { label: '清除搜索', onClick: onClear } : undefined}
      {...props}
    />
  );
}

export function NoItemsInFolderEmptyState({
  folderName,
  onAction,
  ...props
}: Partial<EmptyStateProps> & {
  folderName?: string;
  onAction?: () => void;
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      title={folderName ? `"${folderName}" 是空的` : '文件夹是空的'}
      description="这个文件夹里还没有任何项目"
      action={onAction ? { label: '添加项目', onClick: onAction } : undefined}
      {...props}
    />
  );
}
