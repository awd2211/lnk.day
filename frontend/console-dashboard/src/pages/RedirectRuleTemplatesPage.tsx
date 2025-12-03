import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  GitBranch,
  RefreshCw,
  Percent,
  Globe,
  Smartphone,
  Clock,
  Code,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { templatesService } from '@/lib/api';

type RuleCategory = 'ab_test' | 'geo' | 'device' | 'time' | 'custom';

interface RedirectRuleTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: RuleCategory;
  abTestVariants?: Array<{ name: string; url: string; weight: number }>;
  geoPresets?: Array<{ name?: string; countries: string[]; regions?: string[]; url: string }>;
  devicePresets?: Array<{ name?: string; devices?: string[]; os?: string[]; browsers?: string[]; url: string }>;
  timePresets?: Array<{ name?: string; startTime?: string; endTime?: string; days?: number[]; timezone?: string; url: string }>;
  defaultUrl?: string;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<RuleCategory, { label: string; color: string; icon: any }> = {
  ab_test: { label: 'A/B 测试', color: 'bg-purple-100 text-purple-700', icon: Percent },
  geo: { label: '地理位置', color: 'bg-green-100 text-green-700', icon: Globe },
  device: { label: '设备类型', color: 'bg-blue-100 text-blue-700', icon: Smartphone },
  time: { label: '时间规则', color: 'bg-orange-100 text-orange-700', icon: Clock },
  custom: { label: '自定义', color: 'bg-slate-100 text-slate-700', icon: Code },
};

const DEFAULT_CATEGORY_CONFIG = { label: '未知', color: 'bg-gray-100 text-gray-700', icon: GitBranch };

const getCategoryConfig = (category: string) => {
  return CATEGORY_CONFIG[category as RuleCategory] || DEFAULT_CATEGORY_CONFIG;
};

export default function RedirectRuleTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RedirectRuleTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'ab_test' as RuleCategory,
    defaultUrl: '',
    // A/B Test
    variantsJson: '[{"name": "变体 A", "url": "", "weight": 50}, {"name": "变体 B", "url": "", "weight": 50}]',
    // Geo
    geoRulesJson: '[{"countries": ["CN"], "url": ""}]',
    // Device
    deviceRulesJson: '[{"devices": ["mobile"], "url": ""}]',
    // Time
    timeRulesJson: '[{"days": [1,2,3,4,5], "startTime": "09:00", "endTime": "18:00", "url": ""}]',
    // Custom
    customLogic: '',
    isActive: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['redirect-rule-templates', page, search, type, status],
    queryFn: () =>
      templatesService.getRedirectRuleTemplates({
        page,
        limit: 20,
        search: search || undefined,
        type: type !== 'all' ? type : undefined,
        status: status !== 'all' ? status : undefined,
      }),
  });

  const templates: RedirectRuleTemplate[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: (data: any) => templatesService.createRedirectRuleTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rule-templates'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templatesService.updateRedirectRuleTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rule-templates'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteRedirectRuleTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rule-templates'] });
      setShowDeleteDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => templatesService.toggleRedirectRuleTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rule-templates'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'ab_test',
      defaultUrl: '',
      variantsJson: '[{"name": "变体 A", "url": "", "weight": 50}, {"name": "变体 B", "url": "", "weight": 50}]',
      geoRulesJson: '[{"countries": ["CN"], "url": ""}]',
      deviceRulesJson: '[{"devices": ["mobile"], "url": ""}]',
      timeRulesJson: '[{"days": [1,2,3,4,5], "startTime": "09:00", "endTime": "18:00", "url": ""}]',
      customLogic: '',
      isActive: true,
    });
  };

  const openEditDialog = (template: RedirectRuleTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      defaultUrl: template.defaultUrl || '',
      variantsJson: template.abTestVariants ? JSON.stringify(template.abTestVariants, null, 2) : '[]',
      geoRulesJson: template.geoPresets ? JSON.stringify(template.geoPresets, null, 2) : '[]',
      deviceRulesJson: template.devicePresets ? JSON.stringify(template.devicePresets, null, 2) : '[]',
      timeRulesJson: template.timePresets ? JSON.stringify(template.timePresets, null, 2) : '[]',
      customLogic: '',
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  const preparePayload = () => {
    const payload: any = {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      defaultUrl: formData.defaultUrl || undefined,
      isActive: formData.isActive,
    };

    try {
      switch (formData.category) {
        case 'ab_test':
          payload.abTestVariants = JSON.parse(formData.variantsJson);
          break;
        case 'geo':
          payload.geoPresets = JSON.parse(formData.geoRulesJson);
          break;
        case 'device':
          payload.devicePresets = JSON.parse(formData.deviceRulesJson);
          break;
        case 'time':
          payload.timePresets = JSON.parse(formData.timeRulesJson);
          break;
      }
    } catch (e) {
      // Invalid JSON
    }

    return payload;
  };

  const handleCreate = () => {
    createMutation.mutate(preparePayload());
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({ id: selectedTemplate.id, data: preparePayload() });
  };

  const CategoryIcon = ({ category }: { category: string }) => {
    const config = getCategoryConfig(category);
    const Icon = config.icon;
    return <Icon className="w-5 h-5" />;
  };

  const getRulesSummary = (template: RedirectRuleTemplate) => {
    switch (template.category) {
      case 'ab_test':
        return `${template.abTestVariants?.length || 0} 个变体`;
      case 'geo':
        return `${template.geoPresets?.length || 0} 条地理规则`;
      case 'device':
        return `${template.devicePresets?.length || 0} 条设备规则`;
      case 'time':
        return `${template.timePresets?.length || 0} 条时间规则`;
      case 'custom':
        return '自定义逻辑';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">重定向规则模板</h1>
          <p className="text-gray-600 mt-1">管理 A/B 测试、地理位置、设备类型等重定向规则预设模板</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建模板
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索模板名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
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

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无模板</div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <CategoryIcon category={template.category} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge className={getCategoryConfig(template.category).color}>
                          {getCategoryConfig(template.category).label}
                        </Badge>
                        {!template.isActive && (
                          <Badge variant="outline" className="text-gray-500">已禁用</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{getRulesSummary(template)}</span>
                        <span>使用: {template.usageCount} 次</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={() => toggleMutation.mutate(template.id)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建重定向规则模板</DialogTitle>
            <DialogDescription>创建智能重定向规则预设模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 移动端优化"
                />
              </div>
              <div>
                <Label>规则类型 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as RuleCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="模板用途说明"
              />
            </div>
            <div>
              <Label>默认跳转 URL</Label>
              <Input
                value={formData.defaultUrl}
                onChange={(e) => setFormData({ ...formData, defaultUrl: e.target.value })}
                placeholder="https://example.com (当所有规则都不匹配时使用)"
              />
            </div>

            {formData.category === 'ab_test' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Percent className="w-4 h-4" /> A/B 测试变体 (JSON)
                </h4>
                <Textarea
                  value={formData.variantsJson}
                  onChange={(e) => setFormData({ ...formData, variantsJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  格式: [{'{"name": "变体A", "url": "https://...", "weight": 50}'}]
                </p>
              </div>
            )}

            {formData.category === 'geo' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4" /> 地理位置规则 (JSON)
                </h4>
                <Textarea
                  value={formData.geoRulesJson}
                  onChange={(e) => setFormData({ ...formData, geoRulesJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  格式: [{'{"countries": ["CN", "US"], "url": "https://..."}'}]
                </p>
              </div>
            )}

            {formData.category === 'device' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4" /> 设备规则 (JSON)
                </h4>
                <Textarea
                  value={formData.deviceRulesJson}
                  onChange={(e) => setFormData({ ...formData, deviceRulesJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  格式: [{'{"devices": ["mobile"], "os": ["ios"], "url": "https://..."}'}]
                </p>
              </div>
            )}

            {formData.category === 'time' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" /> 时间规则 (JSON)
                </h4>
                <Textarea
                  value={formData.timeRulesJson}
                  onChange={(e) => setFormData({ ...formData, timeRulesJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  格式: [{'{"days": [1,2,3,4,5], "startTime": "09:00", "endTime": "18:00", "url": "https://..."}'}]
                </p>
              </div>
            )}

            {formData.category === 'custom' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Code className="w-4 h-4" /> 自定义逻辑
                </h4>
                <Textarea
                  value={formData.customLogic}
                  onChange={(e) => setFormData({ ...formData, customLogic: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                  placeholder="// JavaScript 表达式"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>立即启用</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑重定向规则模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>规则类型 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as RuleCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>默认跳转 URL</Label>
              <Input
                value={formData.defaultUrl}
                onChange={(e) => setFormData({ ...formData, defaultUrl: e.target.value })}
              />
            </div>

            {formData.category === 'ab_test' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">A/B 测试变体 (JSON)</h4>
                <Textarea
                  value={formData.variantsJson}
                  onChange={(e) => setFormData({ ...formData, variantsJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
              </div>
            )}

            {formData.category === 'geo' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">地理位置规则 (JSON)</h4>
                <Textarea
                  value={formData.geoRulesJson}
                  onChange={(e) => setFormData({ ...formData, geoRulesJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
              </div>
            )}

            {formData.category === 'device' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">设备规则 (JSON)</h4>
                <Textarea
                  value={formData.deviceRulesJson}
                  onChange={(e) => setFormData({ ...formData, deviceRulesJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
              </div>
            )}

            {formData.category === 'time' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">时间规则 (JSON)</h4>
                <Textarea
                  value={formData.timeRulesJson}
                  onChange={(e) => setFormData({ ...formData, timeRulesJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
              </div>
            )}

            {formData.category === 'custom' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">自定义逻辑</h4>
                <Textarea
                  value={formData.customLogic}
                  onChange={(e) => setFormData({ ...formData, customLogic: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={!formData.name || updateMutation.isPending}>
              {updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除模板 "{selectedTemplate?.name}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
