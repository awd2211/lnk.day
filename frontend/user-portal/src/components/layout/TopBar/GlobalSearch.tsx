import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GlobalSearchProps {
  onOpen: () => void;
}

export function GlobalSearch({ onOpen }: GlobalSearchProps) {
  return (
    <Button
      variant="outline"
      className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
      onClick={onOpen}
    >
      <Search className="mr-2 h-4 w-4" />
      <span className="hidden lg:inline-flex">搜索...</span>
      <span className="inline-flex lg:hidden">搜索</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
