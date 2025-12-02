import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ToggleLeft,
  RefreshCw,
  Check,
  X,
  DollarSign,
  Users,
  Link2,
  QrCode,
  Globe,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlanLimits {
  maxLinks: number;
  maxClicks: number;
  maxQrCodes: number;
  maxTeamMembers: number;
  maxCustomDomains: number;
  maxCampaigns: number;
  maxApiRequests: number;
  maxBioLinks: number;
  maxFolders: number;
  retentionDays: number;
}

interface PlanFeatures {
  customBranding: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  bulkOperations: boolean;
  abtesting: boolean;
  deepLinks: boolean;
  passwordProtection: boolean;
  expiringLinks: boolean;
  geoTargeting: boolean;
  deviceTargeting: boolean;
  webhooks: boolean;
  utmBuilder: boolean;
  socialPreview: boolean;
  qrCodeCustomization: boolean;
  linkRotation: boolean;
  retargeting: boolean;
  whiteLabel: boolean;
  sso: boolean;
  auditLogs: boolean;
  teamRoles: boolean;
  dedicatedSupport: boolean;
  customIntegrations: boolean;
}

interface PlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  limits: PlanLimits;
  features: PlanFeatures;
  pricing: PlanPricing;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  isPublic: boolean;
  trialDays: number;
  trialRequiresCreditCard: boolean;
  badgeText?: string;
  badgeColor?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  createdAt: string;
  updatedAt: string;
}

const defaultLimits: PlanLimits = {
  maxLinks: 100,
  maxClicks: 10000,
  maxQrCodes: 10,
  maxTeamMembers: 1,
  maxCustomDomains: 0,
  maxCampaigns: 5,
  maxApiRequests: 1000,
  maxBioLinks: 1,
  maxFolders: 5,
  retentionDays: 30,
};

const defaultFeatures: PlanFeatures = {
  customBranding: false,
  advancedAnalytics: false,
  apiAccess: false,
  bulkOperations: false,
  abtesting: false,
  deepLinks: false,
  passwordProtection: false,
  expiringLinks: true,
  geoTargeting: false,
  deviceTargeting: false,
  webhooks: false,
  utmBuilder: false,
  socialPreview: false,
  qrCodeCustomization: false,
  linkRotation: false,
  retargeting: false,
  whiteLabel: false,
  sso: false,
  auditLogs: false,
  teamRoles: false,
  dedicatedSupport: false,
  customIntegrations: false,
};

const featureLabels: Record<keyof PlanFeatures, string> = {
  customBranding: '自定义品牌',
  advancedAnalytics: '高级分析',
  apiAccess: 'API 访问',
  bulkOperations: '批量操作',
  abtesting: 'A/B 测试',
  deepLinks: '深度链接',
  passwordProtection: '密码保护',
  expiringLinks: '链接过期',
  geoTargeting: '地理定向',
  deviceTargeting: '设备定向',
  webhooks: 'Webhooks',
  utmBuilder: 'UTM 构建器',
  socialPreview: '社交预览',
  qrCodeCustomization: 'QR 码定制',
  linkRotation: '链接轮换',
  retargeting: '再营销',
  whiteLabel: '白标',
  sso: 'SSO/SAML',
  auditLogs: '审计日志',
  teamRoles: '团队角色',
  dedicatedSupport: '专属支持',
  customIntegrations: '定制集成',
};

const limitLabels: Record<keyof PlanLimits, string> = {
  maxLinks: '最大链接数',
  maxClicks: '月点击数',
  maxQrCodes: 'QR 码数量',
  maxTeamMembers: '团队成员',
  maxCustomDomains: '自定义域名',
  maxCampaigns: '营销活动',
  maxApiRequests: 'API 请求/月',
  maxBioLinks: 'Bio Link 页面',
  maxFolders: '文件夹数',
  retentionDays: '数据保留天数',
};

export default function PlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; plan: Plan | null }>({
    open: false,
    plan: null,
  });
  const [duplicateForm, setDuplicateForm] = useState({ code: '', name: '' });

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    limits: defaultLimits,
    features: defaultFeatures,
    pricing: { monthly: 0, yearly: 0, currency: 'USD' },
    sortOrder: 0,
    isActive: true,
    isDefault: false,
    isPublic: true,
    trialDays: 0,
    trialRequiresCreditCard: false,
    badgeText: '',
    badgeColor: '',
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
  });

  useEffect(() => {
    loadPlans();
  }, [showInactive]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/proxy/plans', {
        params: { includeInactive: showInactive },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast({ title: '加载失败', description: '无法加载套餐列表', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setFormData({
      code: '',
      name: '',
      description: '',
      limits: defaultLimits,
      features: defaultFeatures,
      pricing: { monthly: 0, yearly: 0, currency: 'USD' },
      sortOrder: plans.length,
      isActive: true,
      isDefault: false,
      isPublic: true,
      trialDays: 0,
      trialRequiresCreditCard: false,
      badgeText: '',
      badgeColor: '',
      stripePriceIdMonthly: '',
      stripePriceIdYearly: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (plan: Plan) => {
    setIsCreating(false);
    setEditingPlan(plan);
    setFormData({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      limits: plan.limits,
      features: plan.features,
      pricing: plan.pricing,
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      isPublic: plan.isPublic,
      trialDays: plan.trialDays || 0,
      trialRequiresCreditCard: plan.trialRequiresCreditCard || false,
      badgeText: plan.badgeText || '',
      badgeColor: plan.badgeColor || '',
      stripePriceIdMonthly: plan.stripePriceIdMonthly || '',
      stripePriceIdYearly: plan.stripePriceIdYearly || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        await api.post('/proxy/plans', formData);
        toast({ title: '创建成功', description: '套餐已创建' });
      } else if (editingPlan) {
        await api.put(`/proxy/plans/${editingPlan.id}`, formData);
        toast({ title: '更新成功', description: '套餐已更新' });
      }
      setIsDialogOpen(false);
      loadPlans();
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error.response?.data?.message || '操作失败',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`确定要删除套餐 "${plan.name}" 吗？`)) return;

    try {
      await api.delete(`/proxy/plans/${plan.id}`);
      toast({ title: '删除成功', description: '套餐已删除' });
      loadPlans();
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '无法删除默认套餐',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async (plan: Plan) => {
    try {
      await api.patch(`/proxy/plans/${plan.id}/toggle`);
      toast({
        title: plan.isActive ? '已禁用' : '已启用',
        description: `套餐 "${plan.name}" 已${plan.isActive ? '禁用' : '启用'}`,
      });
      loadPlans();
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateDialog.plan) return;

    try {
      await api.post(`/proxy/plans/${duplicateDialog.plan.id}/duplicate`, duplicateForm);
      toast({ title: '复制成功', description: '套餐已复制' });
      setDuplicateDialog({ open: false, plan: null });
      setDuplicateForm({ code: '', name: '' });
      loadPlans();
    } catch (error: any) {
      toast({
        title: '复制失败',
        description: error.response?.data?.message || '操作失败',
        variant: 'destructive',
      });
    }
  };

  const handleRefreshCache = async () => {
    try {
      await api.post('/proxy/plans/refresh-cache');
      toast({ title: '缓存已刷新' });
    } catch (error) {
      toast({ title: '刷新失败', variant: 'destructive' });
    }
  };

  const formatLimit = (value: number) => {
    if (value === -1) return '无限';
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">套餐管理</h1>
          <p className="text-muted-foreground">管理订阅套餐、配额限制和功能权限</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Label>显示禁用套餐</Label>
          </div>
          <Button variant="outline" onClick={handleRefreshCache}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新缓存
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            新建套餐
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">套餐总数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">启用中</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.filter((p) => p.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">公开展示</CardTitle>
            <Globe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.filter((p) => p.isPublic).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">最高月价</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.max(...plans.map((p) => p.pricing?.monthly || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>套餐列表</CardTitle>
          <CardDescription>管理所有订阅套餐的配置</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>套餐</TableHead>
                  <TableHead>代码</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>主要限制</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} className={!plan.isActive ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {plan.name}
                            {plan.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                默认
                              </Badge>
                            )}
                            {plan.badgeText && (
                              <Badge
                                style={{ backgroundColor: plan.badgeColor || '#10B981' }}
                                className="text-xs text-white"
                              >
                                {plan.badgeText}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{plan.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{plan.code}</code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">${plan.pricing?.monthly || 0}/月</div>
                        <div className="text-muted-foreground">${plan.pricing?.yearly || 0}/年</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          {formatLimit(plan.limits?.maxLinks || 0)} 链接
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {formatLimit(plan.limits?.maxTeamMembers || 0)} 成员
                        </div>
                        <div className="flex items-center gap-1">
                          <QrCode className="h-3 w-3" />
                          {formatLimit(plan.limits?.maxQrCodes || 0)} QR码
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                          {plan.isActive ? '启用' : '禁用'}
                        </Badge>
                        {plan.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            公开
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(plan)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDuplicateDialog({ open: true, plan });
                              setDuplicateForm({
                                code: `${plan.code}_copy`,
                                name: `${plan.name} (副本)`,
                              });
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            复制
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(plan)}>
                            <ToggleLeft className="mr-2 h-4 w-4" />
                            {plan.isActive ? '禁用' : '启用'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(plan)}
                            className="text-red-600"
                            disabled={plan.isDefault}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? '创建套餐' : '编辑套餐'}</DialogTitle>
            <DialogDescription>
              {isCreating ? '创建新的订阅套餐' : `编辑套餐 "${editingPlan?.name}"`}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="limits">配额限制</TabsTrigger>
              <TabsTrigger value="features">功能开关</TabsTrigger>
              <TabsTrigger value="pricing">定价设置</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>套餐代码</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="例如: starter, pro, enterprise"
                    disabled={!isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>套餐名称</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如: 入门版、专业版"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="套餐描述"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>试用天数</Label>
                  <Input
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) =>
                      setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>排序顺序</Label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>角标文字</Label>
                  <Input
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    placeholder="例如: 热门、推荐"
                  />
                </div>
                <div className="space-y-2">
                  <Label>角标颜色</Label>
                  <Input
                    type="color"
                    value={formData.badgeColor || '#10B981'}
                    onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>启用</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                  />
                  <Label>公开展示</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label>设为默认</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.trialRequiresCreditCard}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, trialRequiresCreditCard: checked })
                    }
                  />
                  <Label>试用需要信用卡</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">设置 -1 表示无限制</p>
              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(limitLabels) as (keyof PlanLimits)[]).map((key) => (
                  <div key={key} className="space-y-2">
                    <Label>{limitLabels[key]}</Label>
                    <Input
                      type="number"
                      value={formData.limits[key]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: {
                            ...formData.limits,
                            [key]: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(featureLabels) as (keyof PlanFeatures)[]).map((key) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <Label className="cursor-pointer">{featureLabels[key]}</Label>
                    <div className="flex items-center gap-2">
                      {formData.features[key] ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <Switch
                        checked={formData.features[key]}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            features: {
                              ...formData.features,
                              [key]: checked,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>月付价格 (USD)</Label>
                  <Input
                    type="number"
                    value={formData.pricing.monthly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricing: {
                          ...formData.pricing,
                          monthly: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>年付价格 (USD)</Label>
                  <Input
                    type="number"
                    value={formData.pricing.yearly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricing: {
                          ...formData.pricing,
                          yearly: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>货币</Label>
                  <Input
                    value={formData.pricing.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricing: {
                          ...formData.pricing,
                          currency: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stripe 月付价格 ID</Label>
                  <Input
                    value={formData.stripePriceIdMonthly}
                    onChange={(e) =>
                      setFormData({ ...formData, stripePriceIdMonthly: e.target.value })
                    }
                    placeholder="price_xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stripe 年付价格 ID</Label>
                  <Input
                    value={formData.stripePriceIdYearly}
                    onChange={(e) =>
                      setFormData({ ...formData, stripePriceIdYearly: e.target.value })
                    }
                    placeholder="price_xxx"
                  />
                </div>
              </div>
              {formData.pricing.monthly > 0 && formData.pricing.yearly > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    年付折扣:{' '}
                    <span className="font-medium">
                      {Math.round(
                        (1 - formData.pricing.yearly / (formData.pricing.monthly * 12)) * 100
                      )}
                      %
                    </span>
                    （相当于省 {12 - Math.round(formData.pricing.yearly / formData.pricing.monthly)}{' '}
                    个月）
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{isCreating ? '创建' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialog.open} onOpenChange={(open) => setDuplicateDialog({ open, plan: duplicateDialog.plan })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>复制套餐</DialogTitle>
            <DialogDescription>创建 "{duplicateDialog.plan?.name}" 的副本</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>新套餐代码</Label>
              <Input
                value={duplicateForm.code}
                onChange={(e) => setDuplicateForm({ ...duplicateForm, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>新套餐名称</Label>
              <Input
                value={duplicateForm.name}
                onChange={(e) => setDuplicateForm({ ...duplicateForm, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog({ open: false, plan: null })}>
              取消
            </Button>
            <Button onClick={handleDuplicate}>复制</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
