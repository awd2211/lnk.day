import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ========== 分页组件 ==========

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showLimitSelector?: boolean;
  limitOptions?: number[];
}

export function Pagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  showLimitSelector = false,
  limitOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          共 {total} 条记录
          {total > 0 && `，显示 ${startItem}-${endItem}`}
        </span>
        {showLimitSelector && onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded border px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt}>
                每页 {opt} 条
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          第 {page} / {totalPages || 1} 页
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ========== 可排序表头 ==========

export type SortOrder = 'ASC' | 'DESC' | null;

export interface SortableHeaderProps {
  label: string;
  field: string;
  currentSortBy?: string;
  currentSortOrder?: SortOrder;
  onSort: (field: string, order: SortOrder) => void;
  className?: string;
}

export function SortableHeader({
  label,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSortBy === field;

  const handleClick = () => {
    if (!isActive) {
      onSort(field, 'DESC');
    } else if (currentSortOrder === 'DESC') {
      onSort(field, 'ASC');
    } else {
      onSort(field, null); // 取消排序
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
        isActive && 'text-primary dark:text-primary',
        className
      )}
    >
      {label}
      {isActive ? (
        currentSortOrder === 'DESC' ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  );
}

// ========== 表格骨架加载 ==========

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b px-4 py-4 dark:border-gray-700"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 rounded bg-gray-200 dark:bg-gray-700"
              style={{ width: `${Math.random() * 30 + 10}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ========== 空状态 ==========

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ========== 导出 Hook 用于管理分页和排序状态 ==========

import { useState, useCallback } from 'react';

export interface UsePaginationSortOptions {
  defaultPage?: number;
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: SortOrder;
}

export function usePaginationSort(options: UsePaginationSortOptions = {}) {
  const [page, setPage] = useState(options.defaultPage ?? 1);
  const [limit, setLimit] = useState(options.defaultLimit ?? 10);
  const [sortBy, setSortBy] = useState<string | undefined>(options.defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(options.defaultSortOrder ?? null);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // 重置到第一页
  }, []);

  const handleSort = useCallback((field: string, order: SortOrder) => {
    setSortBy(order ? field : undefined);
    setSortOrder(order);
    setPage(1); // 排序时重置到第一页
  }, []);

  const reset = useCallback(() => {
    setPage(options.defaultPage ?? 1);
    setLimit(options.defaultLimit ?? 10);
    setSortBy(options.defaultSortBy);
    setSortOrder(options.defaultSortOrder ?? null);
  }, [options]);

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    setPage: handlePageChange,
    setLimit: handleLimitChange,
    handleSort,
    reset,
    // 用于传递给 API 的参数
    queryParams: {
      page,
      limit,
      sortBy,
      sortOrder: sortOrder || undefined,
    },
  };
}
