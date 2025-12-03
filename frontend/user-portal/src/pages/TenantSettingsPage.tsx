import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Palette,
  Settings,
  Shield,
  CreditCard,
  Users,
  Key,
  FileText,
  Globe,
  ToggleLeft,
  Gauge,
  Save,
  Upload,
  Trash2,
  Plus,
  ExternalLink,
  Loader2,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { tenantService, domainService, billingService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Types matching backend entity
interface TenantBranding {
  logo?: string;
  logoDark?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
}

interface TenantSettings {
  timezone?: string;
  locale?: string;
  dateFormat?: string;
  currency?: string;
  defaultLinkExpiry?: number;
  allowPublicSignup?: boolean;
  requireEmailVerification?: boolean;
  require2FA?: boolean;
  ipWhitelist?: string[];
  allowedEmailDomains?: string[];
}

interface TenantFeatures {
  analytics?: boolean;
  campaigns?: boolean;
  qrCodes?: boolean;
  bioLinks?: boolean;
  deepLinks?: boolean;
  customDomains?: boolean;
  apiAccess?: boolean;
  webhooks?: boolean;
  sso?: boolean;
  auditLogs?: boolean;
  whiteLabel?: boolean;
  subAccounts?: boolean;
}

interface TenantLimits {
  maxUsers?: number;
  maxTeams?: number;
  maxLinks?: number;
  maxClicks?: number;
  maxDomains?: number;
  maxApiKeys?: number;
  maxWebhooks?: number;
  storageQuota?: number;
}

interface TenantBilling {
  plan?: string;
  customerId?: string;
  subscriptionId?: string;
  billingEmail?: string;
  taxId?: string;
  paymentMethod?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'suspended' | 'pending' | 'trial';
  type: string;
  ownerId: string;
  branding?: TenantBranding;
  customDomain?: string;
  appDomain?: string;
  shortDomain?: string;
  settings?: TenantSettings;
  features?: TenantFeatures;
  limits?: TenantLimits;
  billing?: TenantBilling;
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TenantUsage {
  users: number;
  teams: number;
  links: number;
  clicks: number;
  domains: number;
  apiKeys: number;
  webhooks: number;
  storage: number;
}

interface Domain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  sslStatus?: 'pending' | 'active' | 'expired';
  isDefault: boolean;
  createdAt: string;
}

interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
}

const PLAN_LABELS: Record<string, string> = {
  free: '免费版',
  starter: '入门版',
  pro: '专业版',
  enterprise: '企业版',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  starter: 'bg-green-100 text-green-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  trial: 'bg-blue-100 text-blue-700',
};

export default function TenantSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [branding, setBranding] = useState<TenantBranding>({
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    fontFamily: 'Inter',
  });
  const [settings, setSettings] = useState<TenantSettings>({
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    locale: 'zh-CN',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tenants list (user's tenants)
  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await tenantService.getAll();
      return response.data as Tenant[];
    },
  });

  // Get first tenant (or selected tenant in a more complex app)
  const currentTenant = tenantsData?.[0];

  // Fetch tenant details
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      const response = await tenantService.getOne(currentTenant.id);
      const data = response.data as Tenant;
      // Update form states
      setName(data.name);
      setSlug(data.slug);
      if (data.branding) setBranding(data.branding);
      if (data.settings) setSettings(data.settings);
      return data;
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch usage
  const { data: usage } = useQuery({
    queryKey: ['tenant-usage', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const response = await tenantService.getUsage(tenant.id);
      return response.data as TenantUsage;
    },
    enabled: !!tenant?.id,
  });

  // Fetch domains
  const { data: domainsData } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const response = await domainService.getAll();
      return response.data?.domains || response.data || [];
    },
  });

  // Fetch billing
  const { data: billingData } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const response = await billingService.getSubscription();
      return response.data;
    },
  });

  // Fetch invoices
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await billingService.getInvoices({ limit: 10 });
      return response.data?.invoices || response.data || [];
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (data: { name?: string; slug?: string }) => {
      if (!tenant?.id) throw new Error('No tenant');
      return tenantService.update(tenant.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast({ title: '设置已保存' });
    },
    onError: () => {
      toast({ title: '保存失败', variant: 'destructive' });
    },
  });

  // Update branding mutation
  const updateBrandingMutation = useMutation({
    mutationFn: async (data: TenantBranding) => {
      if (!tenant?.id) throw new Error('No tenant');
      return tenantService.updateBranding(tenant.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast({ title: '品牌设置已保存' });
    },
    onError: () => {
      toast({ title: '保存失败', variant: 'destructive' });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: TenantSettings) => {
      if (!tenant?.id) throw new Error('No tenant');
      return tenantService.updateSettings(tenant.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast({ title: '设置已保存' });
    },
    onError: () => {
      toast({ title: '保存失败', variant: 'destructive' });
    },
  });

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      return domainService.create({ domain });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      setAddDomainOpen(false);
      setNewDomain('');
      toast({ title: '域名已添加' });
    },
    onError: () => {
      toast({ title: '添加失败', variant: 'destructive' });
    },
  });

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      return domainService.verify(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast({ title: '正在验证域名...' });
    },
    onError: () => {
      toast({ title: '验证失败', variant: 'destructive' });
    },
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      return domainService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast({ title: '域名已删除' });
    },
    onError: () => {
      toast({ title: '删除失败', variant: 'destructive' });
    },
  });

  const handleSaveGeneral = () => {
    updateTenantMutation.mutate({ name, slug });
    updateSettingsMutation.mutate(settings);
  };

  const handleSaveBranding = () => {
    updateBrandingMutation.mutate(branding);
  };

  const getUsagePercentage = (used: number | undefined, limit: number | undefined) => {
    if (!used || !limit) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const isLoading = tenantsLoading || tenantLoading;
  const isSaving = updateTenantMutation.isPending || updateBrandingMutation.isPending || updateSettingsMutation.isPending;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!tenant) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">无法加载租户信息</p>
          <p className="text-sm text-muted-foreground mt-2">
            您可能还没有创建组织
          </p>
        </div>
      </AppLayout>
    );
  }

  const domains = domainsData as Domain[] || [];
  const invoices = invoicesData as Invoice[] || [];
  const plan = tenant.billing?.plan || billingData?.plan || 'free';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">租户设置</h1>
            <p className="text-muted-foreground">管理您的组织设置和配置</p>
          </div>
          <div className="flex gap-2">
            <Badge className={STATUS_COLORS[tenant.status]}>
              {tenant.status === 'active' ? '活跃' : tenant.status === 'trial' ? '试用' : tenant.status}
            </Badge>
            <Badge className={PLAN_COLORS[plan]}>
              {PLAN_LABELS[plan] || plan}
            </Badge>
          </div>
        </div>

        {/* Usage Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">链接数量</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(usage?.links)}</div>
              <Progress
                value={getUsagePercentage(usage?.links, tenant.limits?.maxLinks)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(tenant.limits?.maxLinks)} 上限
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">点击量</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(usage?.clicks)}</div>
              <Progress
                value={getUsagePercentage(usage?.clicks, tenant.limits?.maxClicks)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(tenant.limits?.maxClicks)} 上限
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">团队成员</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage?.users || 0}</div>
              <Progress
                value={getUsagePercentage(usage?.users, tenant.limits?.maxUsers)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tenant.limits?.maxUsers || '无限'} 上限
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage?.apiKeys || 0}</div>
              <Progress
                value={getUsagePercentage(usage?.apiKeys, tenant.limits?.maxApiKeys)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tenant.limits?.maxApiKeys || '无限'} 上限
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              基本设置
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="h-4 w-4 mr-2" />
              品牌配置
            </TabsTrigger>
            <TabsTrigger value="features">
              <ToggleLeft className="h-4 w-4 mr-2" />
              功能开关
            </TabsTrigger>
            <TabsTrigger value="domains">
              <Globe className="h-4 w-4 mr-2" />
              域名管理
            </TabsTrigger>
            <TabsTrigger value="billing">
              <CreditCard className="h-4 w-4 mr-2" />
              账单
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
                <CardDescription>管理您的组织基本信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">组织名称</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="输入组织名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">组织标识</Label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="my-company"
                    />
                    <p className="text-xs text-muted-foreground">
                      用于 URL 和 API 调用
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">区域设置</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>时区</Label>
                      <Select
                        value={settings.timezone}
                        onValueChange={(v) => setSettings({ ...settings, timezone: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Shanghai">中国标准时间 (UTC+8)</SelectItem>
                          <SelectItem value="America/New_York">美东时间 (UTC-5)</SelectItem>
                          <SelectItem value="Europe/London">伦敦时间 (UTC+0)</SelectItem>
                          <SelectItem value="Asia/Tokyo">东京时间 (UTC+9)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>日期格式</Label>
                      <Select
                        value={settings.dateFormat}
                        onValueChange={(v) => setSettings({ ...settings, dateFormat: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YYYY-MM-DD">2024-01-15</SelectItem>
                          <SelectItem value="DD/MM/YYYY">15/01/2024</SelectItem>
                          <SelectItem value="MM/DD/YYYY">01/15/2024</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>语言</Label>
                      <Select
                        value={settings.locale}
                        onValueChange={(v) => setSettings({ ...settings, locale: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zh-CN">简体中文</SelectItem>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="ja-JP">日本語</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">安全设置</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>强制双因素认证</Label>
                        <p className="text-sm text-muted-foreground">
                          要求所有成员启用 2FA
                        </p>
                      </div>
                      <Switch
                        checked={settings.require2FA}
                        onCheckedChange={(v) => setSettings({ ...settings, require2FA: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>邮箱验证</Label>
                        <p className="text-sm text-muted-foreground">
                          新成员必须验证邮箱
                        </p>
                      </div>
                      <Switch
                        checked={settings.requireEmailVerification}
                        onCheckedChange={(v) => setSettings({ ...settings, requireEmailVerification: v })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveGeneral} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? '保存中...' : '保存设置'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Branding */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>品牌配置</CardTitle>
                <CardDescription>自定义您的品牌形象</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <Label>Logo</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      {branding.logo ? (
                        <div className="relative inline-block">
                          <img
                            src={branding.logo}
                            alt="Logo"
                            className="h-16 object-contain"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => setBranding({ ...branding, logo: undefined })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            点击或拖放上传 Logo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            建议尺寸: 200x50px, PNG/SVG
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Favicon Upload */}
                  <div className="space-y-4">
                    <Label>Favicon</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      {branding.favicon ? (
                        <div className="relative inline-block">
                          <img
                            src={branding.favicon}
                            alt="Favicon"
                            className="h-8 w-8 object-contain"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => setBranding({ ...branding, favicon: undefined })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            点击或拖放上传 Favicon
                          </p>
                          <p className="text-xs text-muted-foreground">
                            建议尺寸: 32x32px, ICO/PNG
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Colors */}
                <div className="space-y-4">
                  <h4 className="font-medium">颜色配置</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>主色调</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={branding.primaryColor || '#2563eb'}
                          onChange={(e) =>
                            setBranding({ ...branding, primaryColor: e.target.value })
                          }
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={branding.primaryColor || '#2563eb'}
                          onChange={(e) =>
                            setBranding({ ...branding, primaryColor: e.target.value })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>次要颜色</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={branding.secondaryColor || '#1e40af'}
                          onChange={(e) =>
                            setBranding({ ...branding, secondaryColor: e.target.value })
                          }
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={branding.secondaryColor || '#1e40af'}
                          onChange={(e) =>
                            setBranding({ ...branding, secondaryColor: e.target.value })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Typography */}
                <div className="space-y-4">
                  <h4 className="font-medium">字体设置</h4>
                  <div className="space-y-2">
                    <Label>字体系列</Label>
                    <Select
                      value={branding.fontFamily || 'Inter'}
                      onValueChange={(v) => setBranding({ ...branding, fontFamily: v })}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                        <SelectItem value="Noto Sans SC">Noto Sans SC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Custom CSS */}
                <div className="space-y-4">
                  <h4 className="font-medium">自定义 CSS</h4>
                  <Textarea
                    value={branding.customCss || ''}
                    onChange={(e) => setBranding({ ...branding, customCss: e.target.value })}
                    placeholder="/* 在此输入自定义 CSS */"
                    className="font-mono h-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    高级功能：可用于进一步自定义页面样式
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveBranding} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? '保存中...' : '保存品牌设置'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Features */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>功能开关</CardTitle>
                <CardDescription>管理可用功能（基于您的订阅计划）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      key: 'customDomains',
                      label: '自定义域名',
                      description: '使用您自己的域名创建短链接',
                    },
                    {
                      key: 'apiAccess',
                      label: 'API 访问',
                      description: '通过 API 集成和自动化',
                    },
                    {
                      key: 'analytics',
                      label: '高级分析',
                      description: '详细的点击分析和报告',
                    },
                    {
                      key: 'campaigns',
                      label: '营销活动',
                      description: '创建和管理营销活动',
                    },
                    {
                      key: 'whiteLabel',
                      label: '自定义品牌',
                      description: '使用您的品牌标识',
                    },
                    {
                      key: 'webhooks',
                      label: 'Webhooks',
                      description: '实时事件通知',
                    },
                    {
                      key: 'sso',
                      label: 'SSO 单点登录',
                      description: '企业级身份认证',
                    },
                    {
                      key: 'auditLogs',
                      label: '审计日志',
                      description: '记录所有操作历史',
                    },
                  ].map((feature) => (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="space-y-0.5">
                        <Label>{feature.label}</Label>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                      <Switch
                        checked={tenant.features?.[feature.key as keyof TenantFeatures] || false}
                        disabled={!tenant.features?.[feature.key as keyof TenantFeatures]}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild>
                  <a href="/billing">
                    升级计划以解锁更多功能
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Domains */}
          <TabsContent value="domains">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>自定义域名</CardTitle>
                    <CardDescription>
                      管理您的自定义短链接域名
                    </CardDescription>
                  </div>
                  <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        添加域名
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加自定义域名</DialogTitle>
                        <DialogDescription>
                          输入您要使用的域名，然后按照说明完成 DNS 配置
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="domain">域名</Label>
                          <Input
                            id="domain"
                            placeholder="link.yourcompany.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => addDomainMutation.mutate(newDomain)}
                          disabled={!newDomain || addDomainMutation.isPending}
                        >
                          {addDomainMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          添加域名
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {domains.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>还没有添加自定义域名</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>域名</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>SSL</TableHead>
                        <TableHead>添加时间</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domains.map((domain) => (
                        <TableRow key={domain.id}>
                          <TableCell className="font-medium">
                            {domain.domain}
                            {domain.isDefault && (
                              <Badge variant="outline" className="ml-2">默认</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={domain.status === 'verified' ? 'default' : 'secondary'}
                            >
                              {domain.status === 'verified' ? '已验证' : domain.status === 'pending' ? '待验证' : '验证失败'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                domain.sslStatus === 'active'
                                  ? 'text-green-600'
                                  : 'text-yellow-600'
                              }
                            >
                              {domain.sslStatus === 'active' ? (
                                <>
                                  <Shield className="h-3 w-3 mr-1" />
                                  有效
                                </>
                              ) : (
                                '待配置'
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(domain.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {domain.status !== 'verified' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => verifyDomainMutation.mutate(domain.id)}
                                  disabled={verifyDomainMutation.isPending}
                                >
                                  验证
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDomainMutation.mutate(domain.id)}
                                disabled={deleteDomainMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>当前计划</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">
                        {PLAN_LABELS[plan] || plan}
                      </h3>
                      <p className="text-muted-foreground">
                        {billingData?.interval === 'year' ? '按年付费' : '按月付费'}
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <a href="/billing">升级计划</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>账单历史</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无账单记录</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日期</TableHead>
                          <TableHead>描述</TableHead>
                          <TableHead>金额</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              {new Date(invoice.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{invoice.description}</TableCell>
                            <TableCell>
                              {invoice.currency === 'cny' ? '¥' : '$'}
                              {(invoice.amount / 100).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                              >
                                {invoice.status === 'paid' ? '已支付' : invoice.status === 'pending' ? '待支付' : '失败'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => billingService.downloadInvoice(invoice.id)}
                              >
                                下载发票
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
