import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  QrCode,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Palette,
  CheckCircle,
  XCircle,
  Copy,
  Download,
  Sparkles,
  Square,
  Circle,
  Triangle,
} from 'lucide-react';
import { templatesService } from '@/lib/api';
import { toast } from 'sonner';

interface QRStyle {
  id: string;
  name: string;
  description: string;
  category: string;
  style: {
    foregroundColor?: string;
    backgroundColor?: string;
    cornerStyle?: string;
    dotStyle?: string;
    logoPosition?: string;
    margin?: number;
    errorCorrectionLevel?: string;
    gradient?: {
      type: string;
      startColor: string;
      endColor: string;
    } | null;
  };
  thumbnailUrl: string;
  isActive: boolean;
  usageCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const categories = [
  { value: 'classic', label: '经典', icon: Square },
  { value: 'gradient', label: '渐变', icon: Sparkles },
  { value: 'modern', label: '现代', icon: Circle },
];

const cornerStyles = [
  { value: 'square', label: '方形' },
  { value: 'rounded', label: '圆角' },
  { value: 'dots', label: '圆点' },
  { value: 'extra-rounded', label: '超圆角' },
];

const dotStyles = [
  { value: 'square', label: '方形' },
  { value: 'rounded', label: '圆角' },
  { value: 'dots', label: '圆点' },
  { value: 'classy', label: '优雅' },
  { value: 'classy-rounded', label: '优雅圆角' },
];

const errorCorrectionLevels = [
  { value: 'L', label: 'L - 7%' },
  { value: 'M', label: 'M - 15%' },
  { value: 'Q', label: 'Q - 25%' },
  { value: 'H', label: 'H - 30%' },
];

const gradientTypes = [
  { value: 'linear', label: '线性渐变' },
  { value: 'radial', label: '径向渐变' },
];

export default function QrStylesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<QRStyle | null>(null);
  const [useGradient, setUseGradient] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'classic',
    style: {
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
      cornerStyle: 'square',
      dotStyle: 'square',
      logoPosition: 'center',
      margin: 4,
      errorCorrectionLevel: 'M',
      gradient: null as {
        type: string;
        startColor: string;
        endColor: string;
      } | null,
    },
    thumbnailUrl: '',
    isActive: true,
    sortOrder: 0,
  });

  const { data: styles, isLoading } = useQuery({
    queryKey: ['qr-styles', { page, search, category: categoryFilter, status: statusFilter }],
    queryFn: () =>
      templatesService.getQrStyles({
        page,
        limit: 12,
        search: search || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['qr-styles-stats'],
    queryFn: () => templatesService.getStats(),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => templatesService.createQrStyle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-styles'] });
      queryClient.invalidateQueries({ queryKey: ['qr-styles-stats'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('QR 样式创建成功');
    },
    onError: () => {
      toast.error('创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) =>
      templatesService.updateQrStyle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-styles'] });
      setIsEditDialogOpen(false);
      setSelectedStyle(null);
      resetForm();
      toast.success('样式更新成功');
    },
    onError: () => {
      toast.error('更新失败，请重试');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteQrStyle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-styles'] });
      queryClient.invalidateQueries({ queryKey: ['qr-styles-stats'] });
      setIsDeleteDialogOpen(false);
      setSelectedStyle(null);
      toast.success('样式删除成功');
    },
    onError: () => {
      toast.error('删除失败，请重试');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => templatesService.toggleQrStyle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-styles'] });
      toast.success('状态已更新');
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => templatesService.seedQrStyles(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-styles'] });
      queryClient.invalidateQueries({ queryKey: ['qr-styles-stats'] });
      toast.success('默认样式已初始化');
    },
    onError: () => {
      toast.error('初始化失败，请重试');
    },
  });

  const resetForm = () => {
    setUseGradient(false);
    setFormData({
      name: '',
      description: '',
      category: 'classic',
      style: {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        cornerStyle: 'square',
        dotStyle: 'square',
        logoPosition: 'center',
        margin: 4,
        errorCorrectionLevel: 'M',
        gradient: null,
      },
      thumbnailUrl: '',
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleEdit = (style: QRStyle) => {
    setSelectedStyle(style);
    const hasGradient = !!style.style?.gradient;
    setUseGradient(hasGradient);
    setFormData({
      name: style.name,
      description: style.description || '',
      category: style.category,
      style: {
        foregroundColor: style.style?.foregroundColor || '#000000',
        backgroundColor: style.style?.backgroundColor || '#ffffff',
        cornerStyle: style.style?.cornerStyle || 'square',
        dotStyle: style.style?.dotStyle || 'square',
        logoPosition: style.style?.logoPosition || 'center',
        margin: style.style?.margin || 4,
        errorCorrectionLevel: style.style?.errorCorrectionLevel || 'M',
        gradient: style.style?.gradient || null,
      },
      thumbnailUrl: style.thumbnailUrl || '',
      isActive: style.isActive,
      sortOrder: style.sortOrder,
    });
    setIsEditDialogOpen(true);
  };

  const handlePreview = (style: QRStyle) => {
    setSelectedStyle(style);
    setIsPreviewDialogOpen(true);
  };

  const handleDelete = (style: QRStyle) => {
    setSelectedStyle(style);
    setIsDeleteDialogOpen(true);
  };

  const getCategoryLabel = (category: string) => {
    return categories.find((c) => c.value === category)?.label || category;
  };

  const getCategoryIcon = (category: string) => {
    return categories.find((c) => c.value === category)?.icon || Square;
  };

  const styleList = styles?.data?.items || [];
  const totalPages = styles?.data?.pagination?.totalPages || 1;
  const qrStats = stats?.data?.qrStyles || { total: 0, active: 0 };

  const renderQRPreview = (style: QRStyle['style'], size: number = 80) => {
    const fg = style?.foregroundColor || '#000000';
    const bg = style?.backgroundColor || '#ffffff';
    const gradient = style?.gradient;
    const cornerStyle = style?.cornerStyle || 'square';
    const dotStyle = style?.dotStyle || 'square';

    const cornerRadius = cornerStyle === 'square' ? 0 : cornerStyle === 'rounded' ? 4 : 8;
    const dotRadius = dotStyle === 'square' ? 0 : dotStyle === 'dots' ? '50%' : 2;

    // Simple QR-like pattern preview
    const pattern = [
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    ];

    const cellSize = size / 13;
    const margin = cellSize;

    const getFillColor = (x: number, y: number) => {
      if (gradient) {
        return `url(#gradient-${x}-${y})`;
      }
      return fg;
    };

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gradient && (
          <defs>
            {gradient.type === 'linear' ? (
              <linearGradient id="gradient-0-0" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradient.startColor} />
                <stop offset="100%" stopColor={gradient.endColor} />
              </linearGradient>
            ) : (
              <radialGradient id="gradient-0-0">
                <stop offset="0%" stopColor={gradient.startColor} />
                <stop offset="100%" stopColor={gradient.endColor} />
              </radialGradient>
            )}
          </defs>
        )}
        <rect width={size} height={size} fill={bg} />
        {pattern.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <rect
                key={`${x}-${y}`}
                x={margin + x * cellSize}
                y={margin + y * cellSize}
                width={cellSize * 0.9}
                height={cellSize * 0.9}
                fill={gradient ? 'url(#gradient-0-0)' : fg}
                rx={typeof dotRadius === 'number' ? dotRadius : cellSize * 0.45}
                ry={typeof dotRadius === 'number' ? dotRadius : cellSize * 0.45}
              />
            ) : null
          )
        )}
      </svg>
    );
  };

  const StyleFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">样式名称</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例如：渐变蓝紫"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">排序</Label>
          <Input
            id="sortOrder"
            type="number"
            value={formData.sortOrder}
            onChange={(e) =>
              setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="简要描述此样式的特点..."
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>分类</Label>
        <Select
          value={formData.category}
          onValueChange={(v) => setFormData({ ...formData, category: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Color Settings */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" />
          颜色设置
        </h4>
        <div className="flex items-center gap-2 mb-4">
          <Switch
            checked={useGradient}
            onCheckedChange={(checked) => {
              setUseGradient(checked);
              if (checked) {
                setFormData({
                  ...formData,
                  style: {
                    ...formData.style,
                    gradient: {
                      type: 'linear',
                      startColor: '#3b82f6',
                      endColor: '#8b5cf6',
                    },
                  },
                });
              } else {
                setFormData({
                  ...formData,
                  style: {
                    ...formData.style,
                    gradient: null,
                  },
                });
              }
            }}
          />
          <Label>使用渐变</Label>
        </div>

        {useGradient ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>渐变类型</Label>
              <Select
                value={formData.style.gradient?.type || 'linear'}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    style: {
                      ...formData.style,
                      gradient: {
                        ...(formData.style.gradient || { startColor: '#3b82f6', endColor: '#8b5cf6' }),
                        type: v,
                      },
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradientTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>起始颜色</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.style.gradient?.startColor || '#3b82f6'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        style: {
                          ...formData.style,
                          gradient: {
                            ...(formData.style.gradient || { type: 'linear', endColor: '#8b5cf6' }),
                            startColor: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.style.gradient?.startColor || '#3b82f6'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        style: {
                          ...formData.style,
                          gradient: {
                            ...(formData.style.gradient || { type: 'linear', endColor: '#8b5cf6' }),
                            startColor: e.target.value,
                          },
                        },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>结束颜色</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.style.gradient?.endColor || '#8b5cf6'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        style: {
                          ...formData.style,
                          gradient: {
                            ...(formData.style.gradient || { type: 'linear', startColor: '#3b82f6' }),
                            endColor: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.style.gradient?.endColor || '#8b5cf6'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        style: {
                          ...formData.style,
                          gradient: {
                            ...(formData.style.gradient || { type: 'linear', startColor: '#3b82f6' }),
                            endColor: e.target.value,
                          },
                        },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>前景色 (码点)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.style.foregroundColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      style: { ...formData.style, foregroundColor: e.target.value },
                    })
                  }
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={formData.style.foregroundColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      style: { ...formData.style, foregroundColor: e.target.value },
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>背景色</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.style.backgroundColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      style: { ...formData.style, backgroundColor: e.target.value },
                    })
                  }
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={formData.style.backgroundColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      style: { ...formData.style, backgroundColor: e.target.value },
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shape Settings */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">形状设置</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>角点样式</Label>
            <Select
              value={formData.style.cornerStyle}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  style: { ...formData.style, cornerStyle: v },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cornerStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>码点样式</Label>
            <Select
              value={formData.style.dotStyle}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  style: { ...formData.style, dotStyle: v },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dotStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>容错级别</Label>
            <Select
              value={formData.style.errorCorrectionLevel}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  style: { ...formData.style, errorCorrectionLevel: v },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {errorCorrectionLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>边距</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={formData.style.margin}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  style: { ...formData.style, margin: parseInt(e.target.value) || 4 },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4">预览</h4>
        <div className="flex justify-center">
          {renderQRPreview(formData.style, 150)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label>启用样式</Label>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR 码样式</h1>
          <p className="text-muted-foreground">管理二维码样式预设</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedMutation.mutate()}>
            <Sparkles className="mr-2 h-4 w-4" />
            初始化默认样式
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建样式
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总样式数</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qrStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已启用</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qrStats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">样式分类</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已禁用</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qrStats.total - qrStats.active}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索样式名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">已启用</SelectItem>
                <SelectItem value="inactive">已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Style Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">样式列表</h2>
          <span className="text-sm text-muted-foreground">
            共 {styles?.data?.pagination?.total || 0} 个样式
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : styleList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">暂无样式</h3>
              <p className="text-muted-foreground mb-4">点击上方按钮创建第一个样式</p>
              <Button variant="outline" onClick={() => seedMutation.mutate()}>
                <Sparkles className="mr-2 h-4 w-4" />
                初始化默认样式
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {styleList.map((style: QRStyle) => {
                const CategoryIcon = getCategoryIcon(style.category);
                return (
                  <Card key={style.id} className="overflow-hidden">
                    <div className="p-4 bg-muted/30 flex items-center justify-center">
                      {renderQRPreview(style.style, 120)}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{style.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {style.description}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(style)}>
                              <Eye className="mr-2 h-4 w-4" />
                              预览
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(style)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(style.id);
                                toast.success('ID 已复制');
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              复制 ID
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(style)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CategoryIcon className="h-3 w-3" />
                          {getCategoryLabel(style.category)}
                        </Badge>
                        {style.style?.gradient && (
                          <Badge variant="secondary">渐变</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          使用 {style.usageCount || 0} 次
                        </span>
                        <Switch
                          checked={style.isActive}
                          onCheckedChange={() => toggleMutation.mutate(style.id)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建 QR 码样式</DialogTitle>
            <DialogDescription>创建新的二维码样式预设</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <StyleFormFields />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.name}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑 QR 码样式</DialogTitle>
            <DialogDescription>修改样式配置</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <StyleFormFields />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() =>
                selectedStyle && updateMutation.mutate({ id: selectedStyle.id, data: formData })
              }
              disabled={!formData.name}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>样式预览</DialogTitle>
            <DialogDescription>{selectedStyle?.name}</DialogDescription>
          </DialogHeader>
          {selectedStyle && (
            <div className="py-4">
              <div className="flex justify-center mb-6">
                {renderQRPreview(selectedStyle.style, 200)}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">分类:</span>
                  <span>{getCategoryLabel(selectedStyle.category)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">角点样式:</span>
                  <span>
                    {cornerStyles.find((s) => s.value === selectedStyle.style?.cornerStyle)?.label ||
                      '方形'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">码点样式:</span>
                  <span>
                    {dotStyles.find((s) => s.value === selectedStyle.style?.dotStyle)?.label || '方形'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">容错级别:</span>
                  <span>{selectedStyle.style?.errorCorrectionLevel || 'M'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">使用次数:</span>
                  <span>{selectedStyle.usageCount || 0}</span>
                </div>
                {selectedStyle.style?.gradient && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">渐变:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: selectedStyle.style.gradient.startColor }}
                      />
                      <span>→</span>
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: selectedStyle.style.gradient.endColor }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsPreviewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除样式 "{selectedStyle?.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedStyle && deleteMutation.mutate(selectedStyle.id)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
