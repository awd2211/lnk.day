import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ViewMode = 'card' | 'table';

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-lg border p-1', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={view === 'card' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onViewChange('card')}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">卡片视图</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>卡片视图</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onViewChange('table')}
          >
            <List className="h-4 w-4" />
            <span className="sr-only">表格视图</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>表格视图</TooltipContent>
      </Tooltip>
    </div>
  );
}

// Hook to manage view state with localStorage persistence
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'view-mode';

export function useViewMode(key: string = 'default'): [ViewMode, (view: ViewMode) => void] {
  const storageKey = `${STORAGE_KEY}-${key}`;

  const [view, setView] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(storageKey);
    return (stored as ViewMode) || 'card';
  });

  useEffect(() => {
    localStorage.setItem(storageKey, view);
  }, [view, storageKey]);

  return [view, setView];
}
