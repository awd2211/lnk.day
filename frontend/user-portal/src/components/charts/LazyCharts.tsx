import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load chart components to reduce initial bundle size
const LazyClicksLineChart = lazy(() =>
  import('./ClicksLineChart').then((m) => ({ default: m.ClicksLineChart }))
);

const LazyDevicePieChart = lazy(() =>
  import('./DevicePieChart').then((m) => ({ default: m.DevicePieChart }))
);

const LazyBrowserPieChart = lazy(() =>
  import('./BrowserPieChart').then((m) => ({ default: m.BrowserPieChart }))
);

const LazyGeoBarChart = lazy(() =>
  import('./GeoBarChart').then((m) => ({ default: m.GeoBarChart }))
);

const LazyReferrerChart = lazy(() =>
  import('./ReferrerChart').then((m) => ({ default: m.ReferrerChart }))
);

const LazyHourlyHeatmap = lazy(() =>
  import('./HourlyHeatmap').then((m) => ({ default: m.HourlyHeatmap }))
);

interface ChartSkeletonProps {
  height?: number;
}

function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div className="flex flex-col gap-2" style={{ height }}>
      <div className="flex items-end justify-between gap-2 flex-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-muted rounded-t animate-pulse"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

function PieChartSkeleton({ height = 280 }: ChartSkeletonProps) {
  return (
    <div className="flex items-center justify-center gap-8" style={{ height }}>
      <Skeleton className="h-40 w-40 rounded-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-sm" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Props interfaces - define here to avoid importing from individual chart files
interface ClicksLineChartLazyProps {
  data: Array<{ date: string; clicks: number }>;
  height?: number;
}

interface DevicePieChartLazyProps {
  data: Array<{ device: string; clicks: number; percentage: number }>;
  height?: number;
}

interface BrowserPieChartLazyProps {
  data: Array<{ browser: string; clicks: number; percentage: number }>;
  height?: number;
}

interface GeoBarChartLazyProps {
  data: Array<{ country: string; clicks: number; percentage: number }>;
  height?: number;
  maxItems?: number;
}

interface ReferrerChartLazyProps {
  data: Array<{ referrer: string; clicks: number; percentage: number }>;
  height?: number;
  maxItems?: number;
}

interface HourlyHeatmapLazyProps {
  data: Array<{ hour: number; day: number; clicks: number }>;
  height?: number;
}

// Export lazy versions of all charts with proper typing
export function ClicksLineChartLazy(props: ClicksLineChartLazyProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} />}>
      <LazyClicksLineChart {...props} />
    </Suspense>
  );
}

export function DevicePieChartLazy(props: DevicePieChartLazyProps) {
  return (
    <Suspense fallback={<PieChartSkeleton height={props.height} />}>
      <LazyDevicePieChart {...props} />
    </Suspense>
  );
}

export function BrowserPieChartLazy(props: BrowserPieChartLazyProps) {
  return (
    <Suspense fallback={<PieChartSkeleton height={props.height} />}>
      <LazyBrowserPieChart {...props} />
    </Suspense>
  );
}

export function GeoBarChartLazy(props: GeoBarChartLazyProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} />}>
      <LazyGeoBarChart {...props} />
    </Suspense>
  );
}

export function ReferrerChartLazy(props: ReferrerChartLazyProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} />}>
      <LazyReferrerChart {...props} />
    </Suspense>
  );
}

export function HourlyHeatmapLazy(props: HourlyHeatmapLazyProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} />}>
      <LazyHourlyHeatmap {...props} />
    </Suspense>
  );
}
