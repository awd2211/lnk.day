import { useState, useEffect } from 'react';
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
} from 'lucide-react';

import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
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

// Types
interface TenantBranding {
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  customCss?: string;
}

interface TenantSettings {
  timezone: string;
  dateFormat: string;
  language: string;
  emailFrom?: string;
  emailReplyTo?: string;
  webhookSecret?: string;
}

interface TenantFeatures {
  customDomains: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
  teamManagement: boolean;
  customBranding: boolean;
  webhooks: boolean;
  sso: boolean;
  dataExport: boolean;
}

interface TenantLimits {
  maxLinks: number;
  maxClicks: number;
  maxTeamMembers: number;
  maxDomains: number;
  maxApiCalls: number;
  storageLimit: number;
}

interface TenantUsage {
  links: number;
  clicks: number;
  teamMembers: number;
  domains: number;
  apiCalls: number;
  storage: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'active' | 'suspended' | 'trial';
  branding: TenantBranding;
  settings: TenantSettings;
  features: TenantFeatures;
  limits: TenantLimits;
  usage: TenantUsage;
  createdAt: string;
}

// Mock data
const mockTenant: Tenant = {
  id: '1',
  name: '我的企业',
  slug: 'my-company',
  plan: 'pro',
  status: 'active',
  branding: {
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    fontFamily: 'Inter',
  },
  settings: {
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    language: 'zh-CN',
  },
  features: {
    customDomains: true,
    apiAccess: true,
    advancedAnalytics: true,
    teamManagement: true,
    customBranding: true,
    webhooks: true,
    sso: false,
    dataExport: true,
  },
  limits: {
    maxLinks: 10000,
    maxClicks: 1000000,
    maxTeamMembers: 20,
    maxDomains: 5,
    maxApiCalls: 100000,
    storageLimit: 5120,
  },
  usage: {
    links: 2340,
    clicks: 156789,
    teamMembers: 8,
    domains: 2,
    apiCalls: 45678,
    storage: 1024,
  },
  createdAt: '2024-01-15T08:00:00Z',
};

const PLAN_LABELS: Record<string, string> = {
  free: '免费版',
  pro: '专业版',
  enterprise: '企业版',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

export default function TenantSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [branding, setBranding] = useState<TenantBranding>(mockTenant.branding);
  const [settings, setSettings] = useState<TenantSettings>(mockTenant.settings);

  const { toast } = useToast();

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    setIsLoading(true);
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setTenant(mockTenant);
    setName(mockTenant.name);
    setSlug(mockTenant.slug);
    setBranding(mockTenant.branding);
    setSettings(mockTenant.settings);
    setIsLoading(false);
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      // TODO: API call to save tenant settings
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast({ title: '设置已保存' });
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      // TODO: API call to save branding
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast({ title: '品牌设置已保存' });
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!tenant) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">无法加载租户信息</p>
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
            <h1 className="text-2xl font-bold">租户设置</h1>
            <p className="text-muted-foreground">管理您的组织设置和配置</p>
          </div>
          <Badge className={PLAN_COLORS[tenant.plan]}>
            {PLAN_LABELS[tenant.plan]}
          </Badge>
        </div>

        {/* Usage Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">链接数量</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(tenant.usage.links)}</div>
              <Progress
                value={getUsagePercentage(tenant.usage.links, tenant.limits.maxLinks)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(tenant.limits.maxLinks)} 上限
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">点击量</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(tenant.usage.clicks)}</div>
              <Progress
                value={getUsagePercentage(tenant.usage.clicks, tenant.limits.maxClicks)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(tenant.limits.maxClicks)} 上限
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">团队成员</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenant.usage.teamMembers}</div>
              <Progress
                value={getUsagePercentage(tenant.usage.teamMembers, tenant.limits.maxTeamMembers)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tenant.limits.maxTeamMembers} 上限
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API 调用</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(tenant.usage.apiCalls)}</div>
              <Progress
                value={getUsagePercentage(tenant.usage.apiCalls, tenant.limits.maxApiCalls)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(tenant.limits.maxApiCalls)} / 月
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
                        value={settings.language}
                        onValueChange={(v) => setSettings({ ...settings, language: v })}
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
                  <h4 className="font-medium">邮件设置</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="emailFrom">发件人地址</Label>
                      <Input
                        id="emailFrom"
                        type="email"
                        value={settings.emailFrom || ''}
                        onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                        placeholder="noreply@yourcompany.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailReplyTo">回复地址</Label>
                      <Input
                        id="emailReplyTo"
                        type="email"
                        value={settings.emailReplyTo || ''}
                        onChange={(e) => setSettings({ ...settings, emailReplyTo: e.target.value })}
                        placeholder="support@yourcompany.com"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveGeneral} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
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
                          value={branding.primaryColor}
                          onChange={(e) =>
                            setBranding({ ...branding, primaryColor: e.target.value })
                          }
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={branding.primaryColor}
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
                          value={branding.secondaryColor}
                          onChange={(e) =>
                            setBranding({ ...branding, secondaryColor: e.target.value })
                          }
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={branding.secondaryColor}
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
                      value={branding.fontFamily}
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
                  <Save className="h-4 w-4 mr-2" />
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
                      key: 'advancedAnalytics',
                      label: '高级分析',
                      description: '详细的点击分析和报告',
                    },
                    {
                      key: 'teamManagement',
                      label: '团队管理',
                      description: '邀请团队成员并管理权限',
                    },
                    {
                      key: 'customBranding',
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
                      key: 'dataExport',
                      label: '数据导出',
                      description: '导出链接和分析数据',
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
                        checked={tenant.features[feature.key as keyof TenantFeatures]}
                        disabled={!tenant.features[feature.key as keyof TenantFeatures]}
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
                  <Dialog>
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
                          <Input id="domain" placeholder="link.yourcompany.com" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">添加域名</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
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
                    <TableRow>
                      <TableCell className="font-medium">link.mycompany.com</TableCell>
                      <TableCell>
                        <Badge variant="default">已验证</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-600">
                          <Shield className="h-3 w-3 mr-1" />
                          有效
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">2024-01-15</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">go.mycompany.com</TableCell>
                      <TableCell>
                        <Badge variant="secondary">待验证</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-yellow-600">
                          待配置
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">2024-02-01</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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
                        {PLAN_LABELS[tenant.plan]}
                      </h3>
                      <p className="text-muted-foreground">
                        ¥299/月，按年付费
                      </p>
                    </div>
                    <Button variant="outline">升级计划</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>账单历史</CardTitle>
                </CardHeader>
                <CardContent>
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
                      <TableRow>
                        <TableCell>2024-02-01</TableCell>
                        <TableCell>专业版 - 月度订阅</TableCell>
                        <TableCell>¥299.00</TableCell>
                        <TableCell>
                          <Badge variant="default">已支付</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            下载发票
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>2024-01-01</TableCell>
                        <TableCell>专业版 - 月度订阅</TableCell>
                        <TableCell>¥299.00</TableCell>
                        <TableCell>
                          <Badge variant="default">已支付</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            下载发票
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
