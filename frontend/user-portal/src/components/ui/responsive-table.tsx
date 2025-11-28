import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A wrapper component that makes tables horizontally scrollable on mobile devices.
 * Use this to wrap your Table component for better mobile UX.
 */
const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full overflow-x-auto',
          // Add smooth scrolling and momentum scrolling on iOS
          '-webkit-overflow-scrolling-touch',
          // Add scroll shadow indicators
          'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveTable.displayName = 'ResponsiveTable';

/**
 * A card-based alternative layout for displaying table data on mobile.
 * Shows each row as a card with key-value pairs stacked vertically.
 */
interface MobileCardListProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyState?: React.ReactNode;
}

function MobileCardList<T>({
  data,
  renderCard,
  className,
  emptyState,
}: MobileCardListProps<T>) {
  if (!data.length && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, index) => renderCard(item, index))}
    </div>
  );
}

/**
 * A utility component to show table on desktop and cards on mobile.
 */
interface ResponsiveDataViewProps<T> {
  data: T[];
  desktopView: React.ReactNode;
  renderMobileCard: (item: T, index: number) => React.ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg';
  emptyState?: React.ReactNode;
}

function ResponsiveDataView<T>({
  data,
  desktopView,
  renderMobileCard,
  breakpoint = 'md',
  emptyState,
}: ResponsiveDataViewProps<T>) {
  const breakpointClasses = {
    sm: { mobile: 'sm:hidden', desktop: 'hidden sm:block' },
    md: { mobile: 'md:hidden', desktop: 'hidden md:block' },
    lg: { mobile: 'lg:hidden', desktop: 'hidden lg:block' },
  };

  const classes = breakpointClasses[breakpoint];

  return (
    <>
      {/* Mobile: Card view */}
      <div className={classes.mobile}>
        <MobileCardList
          data={data}
          renderCard={renderMobileCard}
          emptyState={emptyState}
        />
      </div>

      {/* Desktop: Table view */}
      <div className={classes.desktop}>{desktopView}</div>
    </>
  );
}

/**
 * A mobile-friendly card for displaying a single data item.
 */
interface DataCardProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

function DataCard({ header, children, footer, onClick, className }: DataCardProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border bg-card p-4 text-left',
        onClick && 'cursor-pointer transition-colors hover:bg-accent',
        className
      )}
    >
      {header && <div className="mb-3 border-b pb-2">{header}</div>}
      <div className="space-y-2">{children}</div>
      {footer && <div className="mt-3 border-t pt-2">{footer}</div>}
    </Wrapper>
  );
}

/**
 * A key-value pair row for use within DataCard.
 */
interface DataRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

function DataRow({ label, value, className }: DataRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export {
  ResponsiveTable,
  MobileCardList,
  ResponsiveDataView,
  DataCard,
  DataRow,
};
