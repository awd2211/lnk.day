import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  className?: string;
}

/**
 * Dashboard page skeleton
 */
export function DashboardSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-1 h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart placeholder */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Table page skeleton (Links, Templates, etc.)
 */
export function TablePageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table */}
      <Card>
        <div className="p-4">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b pb-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="hidden h-4 w-48 md:block" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b py-4 last:border-0"
            >
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="hidden h-4 w-48 md:block" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="hidden h-4 w-20 sm:block" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Detail page skeleton (Link detail, etc.)
 */
export function DetailPageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Settings page skeleton
 */
export function SettingsPageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-80" />

      {/* Settings sections */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
          ))}
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Card grid skeleton (Campaigns, Bio Links, etc.)
 */
export function CardGridSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="mt-4 flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
