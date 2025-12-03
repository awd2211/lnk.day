import { ReactNode, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Search, Sparkles, Loader2 } from 'lucide-react';

interface Category {
  value: string;
  label: string;
}

interface PresetTemplatesSectionProps<T> {
  title?: string;
  description?: string;
  templates: T[] | undefined;
  isLoading: boolean;
  categories?: Category[];
  categoryFilter?: string;
  onCategoryChange?: (category: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  renderTemplate: (template: T) => ReactNode;
  emptyMessage?: string;
  defaultOpen?: boolean;
}

export function PresetTemplatesSection<T>({
  title = '平台预设模板',
  description = '由平台提供的预设配置，可直接使用或作为参考',
  templates,
  isLoading,
  categories,
  categoryFilter,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  renderTemplate,
  emptyMessage = '暂无预设模板',
  defaultOpen = true,
}: PresetTemplatesSectionProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Filters */}
            <div className="mb-4 flex gap-3">
              {onSearchChange && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索预设模板..."
                    value={searchQuery || ''}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              {categories && categories.length > 0 && onCategoryChange && (
                <Select
                  value={categoryFilter || 'all'}
                  onValueChange={(value) =>
                    onCategoryChange(value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="所有分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有分类</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Templates Grid */}
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template, index) => (
                  <div key={index}>{renderTemplate(template)}</div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
