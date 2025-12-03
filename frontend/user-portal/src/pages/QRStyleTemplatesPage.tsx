import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  QrCode,
  Loader2,
  Palette,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import {
  usePresetQRStyles,
  type PresetQRStyle,
} from '@/hooks/usePresetTemplates';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'brand', label: '品牌' },
  { value: 'simple', label: '简约' },
  { value: 'colorful', label: '彩色' },
  { value: 'gradient', label: '渐变' },
  { value: 'themed', label: '主题' },
  { value: 'business', label: '商务' },
];

const DOT_STYLES = [
  { value: 'square', label: '方形' },
  { value: 'dots', label: '圆点' },
  { value: 'rounded', label: '圆角' },
  { value: 'classy', label: '经典' },
  { value: 'classy-rounded', label: '经典圆角' },
];

const CORNER_STYLES = [
  { value: 'square', label: '方形' },
  { value: 'dot', label: '圆点' },
  { value: 'extra-rounded', label: '超圆角' },
];

export default function QRStyleTemplatesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: stylesData, isLoading } = usePresetQRStyles({
    search: searchQuery || undefined,
    category: categoryFilter || undefined,
  });

  const styles: PresetQRStyle[] = stylesData?.data || [];

  const handleUseStyle = (style: PresetQRStyle) => {
    // 跳转到 QR 码创建页面，携带样式参数
    const params = new URLSearchParams();
    params.set('styleId', style.id);
    navigate(`/qr-codes?${params.toString()}`);
    toast({ title: `已选择样式: ${style.name}` });
  };

  const handleCopyStyle = (style: PresetQRStyle) => {
    const styleConfig = JSON.stringify(style.style, null, 2);
    navigator.clipboard.writeText(styleConfig);
    setCopiedId(style.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: '样式配置已复制' });
  };

  const getStylePreview = (style: PresetQRStyle['style']) => {
    return (
      <div
        className="h-20 w-20 rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: style.backgroundColor || '#ffffff',
        }}
      >
        <QrCode
          className="h-12 w-12"
          style={{
            color: style.foregroundColor || '#000000',
          }}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">QR 样式预设</h1>
            <p className="text-muted-foreground">
              浏览并使用平台提供的 QR 码样式预设
            </p>
          </div>
          <Button onClick={() => navigate('/qr-codes')}>
            <QrCode className="mr-2 h-4 w-4" />
            创建 QR 码
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索样式..."
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="所有分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分类</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Style Grid */}
        {styles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {styles.map((style) => (
              <Card key={style.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-1">
                        {style.name}
                      </CardTitle>
                      {style.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {style.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Style Preview */}
                  <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                    {getStylePreview(style.style)}
                  </div>

                  {/* Style Details */}
                  <div className="flex flex-wrap gap-1">
                    {style.category && (
                      <Badge variant="outline">
                        {CATEGORIES.find((c) => c.value === style.category)?.label || style.category}
                      </Badge>
                    )}
                    {style.style.dotStyle && (
                      <Badge variant="secondary" className="text-xs">
                        {DOT_STYLES.find((d) => d.value === style.style.dotStyle)?.label || style.style.dotStyle}
                      </Badge>
                    )}
                    {style.style.cornerStyle && (
                      <Badge variant="secondary" className="text-xs">
                        {CORNER_STYLES.find((c) => c.value === style.style.cornerStyle)?.label || style.style.cornerStyle}
                      </Badge>
                    )}
                  </div>

                  {/* Color Preview */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div
                        className="h-4 w-4 rounded border"
                        style={{ backgroundColor: style.style.foregroundColor || '#000000' }}
                      />
                      <span>前景</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-4 w-4 rounded border"
                        style={{ backgroundColor: style.style.backgroundColor || '#ffffff' }}
                      />
                      <span>背景</span>
                    </div>
                    {style.style.logoUrl && (
                      <Badge variant="outline" className="text-xs">
                        含 Logo
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleUseStyle(style)}
                    >
                      <Palette className="mr-2 h-4 w-4" />
                      使用此样式
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyStyle(style)}
                    >
                      {copiedId === style.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {searchQuery || categoryFilter ? '未找到匹配的样式' : '暂无 QR 样式预设'}
              </h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || categoryFilter ? '尝试使用其他关键词搜索' : '系统管理员可在后台添加样式预设'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">如何使用 QR 样式？</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  点击"使用此样式"按钮，系统将跳转到 QR 码创建页面并自动应用选中的样式。
                  您也可以复制样式配置用于 API 调用。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
