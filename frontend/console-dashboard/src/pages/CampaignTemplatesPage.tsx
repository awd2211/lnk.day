import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Target,
  Eye,
  EyeOff,
  RefreshCw,
  Calendar,
  Megaphone,
  Gift,
  Zap,
  Sun,
  TrendingUp,
  Users,
  PartyPopper,
  Heart,
  Mail,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { templatesService } from '@/lib/api';

interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  scenario: string;
  defaultGoals?: string[];
  suggestedChannels?: string[];
  suggestedDuration?: number;
  settings?: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

interface ScenarioOption {
  value: string;
  label: string;
}

const SCENARIO_CONFIG: Record<string, { label: string; icon: typeof Target; color: string; description: string }> = {
  holiday_promotion: { label: '节日促销', icon: Gift, color: 'bg-red-100 text-red-700', description: '节假日特惠活动' },
  new_product_launch: { label: '新品发布', icon: Zap, color: 'bg-purple-100 text-purple-700', description: '新产品上线推广' },
  flash_sale: { label: '限时抢购', icon: Zap, color: 'bg-orange-100 text-orange-700', description: '限时优惠活动' },
  seasonal_campaign: { label: '季节性活动', icon: Sun, color: 'bg-yellow-100 text-yellow-700', description: '季节性营销活动' },
  brand_awareness: { label: '品牌推广', icon: Megaphone, color: 'bg-blue-100 text-blue-700', description: '提升品牌知名度' },
  lead_generation: { label: '获客活动', icon: TrendingUp, color: 'bg-green-100 text-green-700', description: '获取潜在客户' },
  event_marketing: { label: '活动营销', icon: PartyPopper, color: 'bg-pink-100 text-pink-700', description: '线上线下活动' },
  influencer_collaboration: { label: '网红合作', icon: Heart, color: 'bg-rose-100 text-rose-700', description: 'KOL/KOC合作推广' },
  referral_program: { label: '推荐计划', icon: Users, color: 'bg-indigo-100 text-indigo-700', description: '用户推荐奖励' },
  newsletter: { label: '邮件营销', icon: Mail, color: 'bg-teal-100 text-teal-700', description: '邮件订阅活动' },
  other: { label: '其他', icon: Target, color: 'bg-gray-100 text-gray-700', description: '其他类型活动' },
};

const CHANNEL_OPTIONS = [
  { value: 'social_media', label: '社交媒体' },
  { value: 'email', label: '邮件' },
  { value: 'paid_ads', label: '付费广告' },
  { value: 'seo', label: 'SEO' },
  { value: 'content', label: '内容营销' },
  { value: 'influencer', label: '网红推广' },
  { value: 'offline', label: '线下活动' },
  { value: 'partner', label: '合作伙伴' },
];

const GOAL_OPTIONS = [
  { value: 'clicks', label: '点击量' },
  { value: 'conversions', label: '转化数' },
  { value: 'revenue', label: '收入' },
  { value: 'signups', label: '注册数' },
  { value: 'downloads', label: '下载量' },
  { value: 'engagement', label: '互动率' },
  { value: 'reach', label: '覆盖人数' },
  { value: 'leads', label: '线索数' },
];

export default function CampaignTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [scenario, setScenario] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scenario: 'other',
    defaultGoals: [] as string[],
    suggestedChannels: [] as string[],
    suggestedDuration: 7,
    isActive: true,
  });

  const queryClient = useQueryClient();

  // Fetch templates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaign-templates', page, search, scenario, status],
    queryFn: () =>
      templatesService.getCampaignTemplates({
        page,
        limit: 20,
        search: search || undefined,
        scenario: scenario !== 'all' ? scenario : undefined,
        status: status !== 'all' ? status as 'active' | 'inactive' : undefined,
      }),
  });

  // Fetch scenarios
  const { data: scenariosData } = useQuery({
    queryKey: ['campaign-scenarios'],
    queryFn: () => templatesService.getCampaignScenarios(),
  });

  const templates: CampaignTemplate[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
  const scenarios: ScenarioOption[] = scenariosData?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => templatesService.createCampaignTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templatesService.updateCampaignTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteCampaignTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });
      setShowDeleteDialog(false);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scenario: 'other',
      defaultGoals: [],
      suggestedChannels: [],
      suggestedDuration: 7,
      isActive: true,
    });
  };

  const openEditDialog = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    // defaultGoals 可能是对象 {clicks: 10000} 或数组 ['clicks']，需要统一转为数组
    const goals = template.defaultGoals;
    const goalsArray = Array.isArray(goals) ? goals : (goals ? Object.keys(goals) : []);
    setFormData({
      name: template.name,
      description: template.description || '',
      scenario: template.scenario,
      defaultGoals: goalsArray,
      suggestedChannels: template.suggestedChannels || [],
      suggestedDuration: template.suggestedDuration || 7,
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  const handleCreate = () => {
    createMutation.mutate({
      ...formData,
      defaultGoals: formData.defaultGoals.length > 0 ? formData.defaultGoals : undefined,
      suggestedChannels: formData.suggestedChannels.length > 0 ? formData.suggestedChannels : undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      data: {
        ...formData,
        defaultGoals: formData.defaultGoals.length > 0 ? formData.defaultGoals : undefined,
        suggestedChannels: formData.suggestedChannels.length > 0 ? formData.suggestedChannels : undefined,
      },
    });
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">活动模板</h1>
          <p className="text-gray-600 mt-1">管理平台预设营销活动模板，帮助用户快速创建营销活动</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总模板数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">促销活动</CardTitle>
            <Gift className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {templates.filter(t => ['holiday_promotion', 'flash_sale'].includes(t.scenario)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">品牌推广</CardTitle>
            <Megaphone className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {templates.filter(t => ['brand_awareness', 'new_product_launch'].includes(t.scenario)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">获客转化</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => ['lead_generation', 'referral_program'].includes(t.scenario)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="场景" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部场景</SelectItem>
                {scenarios.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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

      {/* Templates List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无模板</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const scenarioConfig = SCENARIO_CONFIG[template.scenario] ?? SCENARIO_CONFIG.other!;
                const Icon = scenarioConfig.icon;
                return (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${scenarioConfig.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            {!template.isActive && (
                              <Badge variant="outline" className="text-gray-500">已禁用</Badge>
                            )}
                          </div>
                          <Badge className={`${scenarioConfig.color} mt-1`}>
                            {scenarioConfig.label}
                          </Badge>
                          {template.description && (
                            <p className="text-sm text-gray-500 mt-2">{template.description}</p>
                          )}
                        </div>
                      </div>
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      {template.suggestedChannels?.map((channel) => {
                        const channelConfig = CHANNEL_OPTIONS.find(c => c.value === channel);
                        return (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channelConfig?.label || channel}
                          </Badge>
                        );
                      })}
                    </div>
                    {template.suggestedDuration && (
                      <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        建议时长: {template.suggestedDuration} 天
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建活动模板</DialogTitle>
            <DialogDescription>
              创建一个新的营销活动模板，用户可在创建活动时选择使用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>模板名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 双11购物节"
              />
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
              <Label>活动场景 *</Label>
              <Select
                value={formData.scenario}
                onValueChange={(v) => setFormData({ ...formData, scenario: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCENARIO_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>建议时长 (天)</Label>
              <Input
                type="number"
                value={formData.suggestedDuration}
                onChange={(e) => setFormData({ ...formData, suggestedDuration: parseInt(e.target.value) || 7 })}
                min={1}
              />
            </div>
            <div>
              <Label>推广渠道</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {CHANNEL_OPTIONS.map((channel) => (
                  <div key={channel.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`channel-${channel.value}`}
                      checked={formData.suggestedChannels.includes(channel.value)}
                      onCheckedChange={() => setFormData({
                        ...formData,
                        suggestedChannels: toggleArrayItem(formData.suggestedChannels, channel.value)
                      })}
                    />
                    <label htmlFor={`channel-${channel.value}`} className="text-sm">
                      {channel.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>默认目标</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {GOAL_OPTIONS.map((goal) => (
                  <div key={goal.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`goal-${goal.value}`}
                      checked={formData.defaultGoals.includes(goal.value)}
                      onCheckedChange={() => setFormData({
                        ...formData,
                        defaultGoals: toggleArrayItem(formData.defaultGoals, goal.value)
                      })}
                    />
                    <label htmlFor={`goal-${goal.value}`} className="text-sm">
                      {goal.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>立即启用</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑活动模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>模板名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>活动场景</Label>
              <Select
                value={formData.scenario}
                onValueChange={(v) => setFormData({ ...formData, scenario: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCENARIO_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>建议时长 (天)</Label>
              <Input
                type="number"
                value={formData.suggestedDuration}
                onChange={(e) => setFormData({ ...formData, suggestedDuration: parseInt(e.target.value) || 7 })}
                min={1}
              />
            </div>
            <div>
              <Label>推广渠道</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {CHANNEL_OPTIONS.map((channel) => (
                  <div key={channel.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-channel-${channel.value}`}
                      checked={formData.suggestedChannels.includes(channel.value)}
                      onCheckedChange={() => setFormData({
                        ...formData,
                        suggestedChannels: toggleArrayItem(formData.suggestedChannels, channel.value)
                      })}
                    />
                    <label htmlFor={`edit-channel-${channel.value}`} className="text-sm">
                      {channel.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>默认目标</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {GOAL_OPTIONS.map((goal) => (
                  <div key={goal.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-goal-${goal.value}`}
                      checked={formData.defaultGoals.includes(goal.value)}
                      onCheckedChange={() => setFormData({
                        ...formData,
                        defaultGoals: toggleArrayItem(formData.defaultGoals, goal.value)
                      })}
                    />
                    <label htmlFor={`edit-goal-${goal.value}`} className="text-sm">
                      {goal.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
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
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
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
