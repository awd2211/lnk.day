import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye } from 'lucide-react';

interface PresetTemplateCardProps {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  icon?: ReactNode;
  onUse: () => void;
  onPreview?: () => void;
  isLoading?: boolean;
}

export function PresetTemplateCard({
  name,
  description,
  category,
  tags = [],
  icon,
  onUse,
  onPreview,
  isLoading,
}: PresetTemplateCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {icon && <div className="text-muted-foreground">{icon}</div>}
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              {category && (
                <Badge variant="outline" className="mt-1">
                  {category}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {description && (
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {onPreview && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onPreview}
            >
              <Eye className="mr-1 h-3 w-3" />
              预览
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1"
            onClick={onUse}
            disabled={isLoading}
          >
            <Copy className="mr-1 h-3 w-3" />
            使用模板
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
