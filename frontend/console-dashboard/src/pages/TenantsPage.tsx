import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHORT_LINK_DOMAIN } from '@/lib/config';
import {
  Search,
  Building2,
  Users,
  Link2,
  MoreHorizontal,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  Shield,
  Settings,
  Globe,
  Palette,
  CreditCard,
  Activity,
  Eye,
  Download,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Database,
  Server,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending' | 'trial';
  plan: string;
  createdAt: string;
  ownerEmail: string;
  ownerName: string;
  usersCount: number;
  linksCount: number;
  clicksCount: number;
  customDomain?: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  features: {
    whiteLabel: boolean;
    customDomains: boolean;
    apiAccess: boolean;
    sso: boolean;
    advancedAnalytics: boolean;
  };
  usage: {
    linksUsed: number;
    linksLimit: number;
    clicksUsed: number;
    clicksLimit: number;
    usersUsed: number;
    usersLimit: number;
    apiCallsUsed: number;
    apiCallsLimit: number;
  };
  settings?: {
    timezone: string;
    dateFormat: string;
    language: string;
  };
}

interface TenantStats {
  total: number;
  active: number;
  suspended: number;
  trial: number;
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  growth: {
    tenants: number;
    users: number;
    links: number;
    clicks: number;
  };
}

// Mock API services
const tenantsService = {
  getStats: () => api.get('/tenants/stats'),
  getTenants: (params?: { page?: number; limit?: number; search?: string; status?: string; plan?: string }) =>
    api.get('/tenants', { params }),
  getTenant: (id: string) => api.get(`/tenants/${id}`),
  createTenant: (data: any) => api.post('/tenants', data),
  updateTenant: (id: string, data: any) => api.put(`/tenants/${id}`, data),
  deleteTenant: (id: string) => api.delete(`/tenants/${id}`),
  toggleStatus: (id: string, status: string) => api.patch(`/tenants/${id}/status`, { status }),
  updateQuota: (id: string, quota: any) => api.patch(`/tenants/${id}/quota`, quota),
  updateFeatures: (id: string, features: any) => api.patch(`/tenants/${id}/features`, features),
  updateBranding: (id: string, branding: any) => api.patch(`/tenants/${id}/branding`, branding),
  getUsageHistory: (id: string) => api.get(`/tenants/${id}/usage-history`),
  getAuditLogs: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/tenants/${id}/audit-logs`, { params }),
  impersonate: (id: string) => api.post(`/tenants/${id}/impersonate`),
};

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  // Form state for creating/editing
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    plan: 'core',
    features: {
      whiteLabel: false,
      customDomains: false,
      apiAccess: true,
      sso: false,
      advancedAnalytics: false,
    },
    usage: {
      linksLimit: 1000,
      clicksLimit: 100000,
      usersLimit: 10,
      apiCallsLimit: 10000,
    },
  });

  // Mock stats data
  const stats: TenantStats = {
    total: 156,
    active: 142,
    suspended: 8,
    trial: 6,
    totalUsers: 2847,
    totalLinks: 45892,
    totalClicks: 3456789,
    growth: {
      tenants: 12.5,
      users: 8.3,
      links: 15.7,
      clicks: 23.4,
    },
  };

  // Mock tenants data
  const mockTenants: Tenant[] = [
    {
      id: '1',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      status: 'active',
      plan: 'enterprise',
      createdAt: '2024-01-15T10:00:00Z',
      ownerEmail: 'admin@acme.com',
      ownerName: 'John Smith',
      usersCount: 45,
      linksCount: 1250,
      clicksCount: 89000,
      customDomain: 'links.acme.com',
      branding: {
        logo: '/placeholder-logo.png',
        primaryColor: '#1a56db',
        accentColor: '#7e3af2',
      },
      features: {
        whiteLabel: true,
        customDomains: true,
        apiAccess: true,
        sso: true,
        advancedAnalytics: true,
      },
      usage: {
        linksUsed: 1250,
        linksLimit: 10000,
        clicksUsed: 89000,
        clicksLimit: 1000000,
        usersUsed: 45,
        usersLimit: 100,
        apiCallsUsed: 45000,
        apiCallsLimit: 100000,
      },
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        language: 'en',
      },
    },
    {
      id: '2',
      name: 'TechStart Inc',
      slug: 'techstart',
      status: 'active',
      plan: 'growth',
      createdAt: '2024-02-20T14:30:00Z',
      ownerEmail: 'founder@techstart.io',
      ownerName: 'Sarah Chen',
      usersCount: 12,
      linksCount: 450,
      clicksCount: 23500,
      features: {
        whiteLabel: false,
        customDomains: true,
        apiAccess: true,
        sso: false,
        advancedAnalytics: true,
      },
      usage: {
        linksUsed: 450,
        linksLimit: 2000,
        clicksUsed: 23500,
        clicksLimit: 200000,
        usersUsed: 12,
        usersLimit: 25,
        apiCallsUsed: 8900,
        apiCallsLimit: 50000,
      },
      settings: {
        timezone: 'America/Los_Angeles',
        dateFormat: 'YYYY-MM-DD',
        language: 'en',
      },
    },
    {
      id: '3',
      name: 'Marketing Pro',
      slug: 'marketing-pro',
      status: 'trial',
      plan: 'premium',
      createdAt: '2024-11-01T09:00:00Z',
      ownerEmail: 'demo@marketingpro.com',
      ownerName: 'Mike Wilson',
      usersCount: 3,
      linksCount: 25,
      clicksCount: 1200,
      features: {
        whiteLabel: true,
        customDomains: false,
        apiAccess: true,
        sso: false,
        advancedAnalytics: true,
      },
      usage: {
        linksUsed: 25,
        linksLimit: 5000,
        clicksUsed: 1200,
        clicksLimit: 500000,
        usersUsed: 3,
        usersLimit: 50,
        apiCallsUsed: 150,
        apiCallsLimit: 75000,
      },
      settings: {
        timezone: 'Europe/London',
        dateFormat: 'DD/MM/YYYY',
        language: 'en',
      },
    },
    {
      id: '4',
      name: 'Suspended Corp',
      slug: 'suspended-corp',
      status: 'suspended',
      plan: 'core',
      createdAt: '2024-06-10T11:00:00Z',
      ownerEmail: 'admin@suspended.com',
      ownerName: 'Bob Johnson',
      usersCount: 5,
      linksCount: 89,
      clicksCount: 3400,
      features: {
        whiteLabel: false,
        customDomains: false,
        apiAccess: true,
        sso: false,
        advancedAnalytics: false,
      },
      usage: {
        linksUsed: 89,
        linksLimit: 500,
        clicksUsed: 3400,
        clicksLimit: 50000,
        usersUsed: 5,
        usersLimit: 10,
        apiCallsUsed: 2100,
        apiCallsLimit: 10000,
      },
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        language: 'en',
      },
    },
  ];

  const filteredTenants = mockTenants.filter((tenant) => {
    const matchesSearch =
      !search ||
      tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(search.toLowerCase()) ||
      tenant.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">活跃</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700">已暂停</Badge>;
      case 'trial':
        return <Badge className="bg-yellow-100 text-yellow-700">试用</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-700">待激活</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      core: 'bg-blue-100 text-blue-700',
      growth: 'bg-purple-100 text-purple-700',
      premium: 'bg-amber-100 text-amber-700',
      enterprise: 'bg-indigo-100 text-indigo-700',
    };
    return <Badge className={colors[plan] || 'bg-gray-100'}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Badge>;
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSelectTenant = (tenantId: string, checked: boolean) => {
    if (checked) {
      setSelectedTenants([...selectedTenants, tenantId]);
    } else {
      setSelectedTenants(selectedTenants.filter((id) => id !== tenantId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTenants(filteredTenants.map((t) => t.id));
    } else {
      setSelectedTenants([]);
    }
  };

  const handleToggleStatus = (tenant: Tenant) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    // Call API to toggle status
    console.log('Toggle status:', tenant.id, newStatus);
  };

  const handleDelete = (tenant: Tenant) => {
    if (confirm(`确定要删除租户 "${tenant.name}" 吗？此操作将永久删除所有数据！`)) {
      console.log('Delete tenant:', tenant.id);
    }
  };

  const handleViewTenant = (tenant: Tenant) => {
    setViewingTenant(tenant);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      ownerEmail: tenant.ownerEmail,
      plan: tenant.plan,
      features: tenant.features,
      usage: {
        linksLimit: tenant.usage.linksLimit,
        clicksLimit: tenant.usage.clicksLimit,
        usersLimit: tenant.usage.usersLimit,
        apiCallsLimit: tenant.usage.apiCallsLimit,
      },
    });
  };

  const handleImpersonate = (tenant: Tenant) => {
    if (confirm(`确定要以租户 "${tenant.name}" 的身份登录吗？`)) {
      console.log('Impersonate tenant:', tenant.id);
      // In real implementation, this would redirect to the user portal with impersonation token
      window.open(`/impersonate/${tenant.id}`, '_blank');
    }
  };

  const isAllSelected = filteredTenants.length > 0 && selectedTenants.length === filteredTenants.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">租户管理</h1>
          <p className="text-gray-500">管理平台上的所有企业租户账户</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建租户
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              {stats.growth.tenants}%
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-500">总租户数</p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-green-600">{stats.active} 活跃</span>
            <span className="text-yellow-600">{stats.trial} 试用</span>
            <span className="text-red-600">{stats.suspended} 暂停</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              {stats.growth.users}%
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{formatNumber(stats.totalUsers)}</p>
          <p className="text-sm text-gray-500">总用户数</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3">
              <Link2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              {stats.growth.links}%
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{formatNumber(stats.totalLinks)}</p>
          <p className="text-sm text-gray-500">总链接数</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              {stats.growth.clicks}%
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{formatNumber(stats.totalClicks)}</p>
          <p className="text-sm text-gray-500">总点击数</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索租户名称、域名或邮箱..."
              className="w-80 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="trial">试用</SelectItem>
              <SelectItem value="suspended">已暂停</SelectItem>
              <SelectItem value="pending">待激活</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="套餐" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部套餐</SelectItem>
              <SelectItem value="free">免费版</SelectItem>
              <SelectItem value="core">核心版</SelectItem>
              <SelectItem value="growth">成长版</SelectItem>
              <SelectItem value="premium">高级版</SelectItem>
              <SelectItem value="enterprise">企业版</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-sm text-gray-500">共 {filteredTenants.length} 个租户</span>
      </div>

      {/* Bulk Actions */}
      {selectedTenants.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
          <span className="text-sm text-blue-700">已选择 {selectedTenants.length} 个租户</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <CheckCircle className="mr-2 h-4 w-4" />
              批量激活
            </Button>
            <Button variant="outline" size="sm">
              <Ban className="mr-2 h-4 w-4" />
              批量暂停
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              批量删除
            </Button>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">租户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">套餐</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">功能</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTenants.map((tenant) => {
                const linksUsage = getUsagePercentage(tenant.usage.linksUsed, tenant.usage.linksLimit);
                return (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedTenants.includes(tenant.id)}
                        onCheckedChange={(checked) => handleSelectTenant(tenant.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        className="flex items-center gap-3 text-left hover:underline"
                        onClick={() => handleViewTenant(tenant)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {tenant.branding?.logo ? (
                            <img src={tenant.branding.logo} alt="" className="h-8 w-8 rounded" />
                          ) : (
                            <Building2 className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-xs text-gray-500">
                            {tenant.customDomain || `${tenant.slug}.${SHORT_LINK_DOMAIN}`}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(tenant.status)}</td>
                    <td className="px-4 py-4">{getPlanBadge(tenant.plan)}</td>
                    <td className="px-4 py-4">
                      <div className="w-24">
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{formatNumber(tenant.usage.linksUsed)}</span>
                          <span className="text-gray-400">/ {formatNumber(tenant.usage.linksLimit)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full ${getUsageColor(linksUsage)}`}
                            style={{ width: `${linksUsage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-gray-400" />
                        {tenant.usersCount}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        {tenant.features.whiteLabel && (
                          <span title="白标" className="rounded bg-purple-100 p-1">
                            <Palette className="h-3 w-3 text-purple-600" />
                          </span>
                        )}
                        {tenant.features.customDomains && (
                          <span title="自定义域名" className="rounded bg-blue-100 p-1">
                            <Globe className="h-3 w-3 text-blue-600" />
                          </span>
                        )}
                        {tenant.features.sso && (
                          <span title="SSO" className="rounded bg-green-100 p-1">
                            <Shield className="h-3 w-3 text-green-600" />
                          </span>
                        )}
                        {tenant.features.apiAccess && (
                          <span title="API" className="rounded bg-orange-100 p-1">
                            <Zap className="h-3 w-3 text-orange-600" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">{formatDate(tenant.createdAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewTenant(tenant)}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleImpersonate(tenant)}>
                            <Users className="mr-2 h-4 w-4" />
                            模拟登录
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(tenant)}>
                            {tenant.status === 'active' ? (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                暂停租户
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                激活租户
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(tenant)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除租户
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-sm text-gray-500">
            第 {page} 页，共 {Math.ceil(filteredTenants.length / 20)} 页
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(filteredTenants.length / 20)}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </div>

      {/* Tenant Detail Sheet */}
      <Sheet open={!!viewingTenant} onOpenChange={() => setViewingTenant(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>租户详情</SheetTitle>
            <SheetDescription>查看和管理租户的完整信息</SheetDescription>
          </SheetHeader>

          {viewingTenant && (
            <div className="mt-6 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  {viewingTenant.branding?.logo ? (
                    <img src={viewingTenant.branding.logo} alt="" className="h-12 w-12 rounded-lg" />
                  ) : (
                    <Building2 className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{viewingTenant.name}</h3>
                  <p className="text-sm text-gray-500">
                    {viewingTenant.customDomain || `${viewingTenant.slug}.${SHORT_LINK_DOMAIN}`}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(viewingTenant.status)}
                    {getPlanBadge(viewingTenant.plan)}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleImpersonate(viewingTenant)}>
                  <Users className="mr-2 h-4 w-4" />
                  模拟登录
                </Button>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">概览</TabsTrigger>
                  <TabsTrigger value="usage" className="flex-1">用量</TabsTrigger>
                  <TabsTrigger value="features" className="flex-1">功能</TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1">设置</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {/* Owner Info */}
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 font-medium">所有者信息</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">姓名</p>
                        <p className="font-medium">{viewingTenant.ownerName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">邮箱</p>
                        <p className="font-medium">{viewingTenant.ownerEmail}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">创建时间</p>
                        <p className="font-medium">{formatDate(viewingTenant.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">自定义域名</p>
                        <p className="font-medium">{viewingTenant.customDomain || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <Users className="mx-auto h-6 w-6 text-blue-600" />
                      <p className="mt-2 text-2xl font-bold text-blue-700">{viewingTenant.usersCount}</p>
                      <p className="text-sm text-blue-600">用户</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4 text-center">
                      <Link2 className="mx-auto h-6 w-6 text-green-600" />
                      <p className="mt-2 text-2xl font-bold text-green-700">
                        {formatNumber(viewingTenant.linksCount)}
                      </p>
                      <p className="text-sm text-green-600">链接</p>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-4 text-center">
                      <Activity className="mx-auto h-6 w-6 text-orange-600" />
                      <p className="mt-2 text-2xl font-bold text-orange-700">
                        {formatNumber(viewingTenant.clicksCount)}
                      </p>
                      <p className="text-sm text-orange-600">点击</p>
                    </div>
                  </div>

                  {/* Branding */}
                  {viewingTenant.branding && (
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 font-medium">品牌设置</h4>
                      <div className="flex items-center gap-4">
                        {viewingTenant.branding.primaryColor && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded border"
                              style={{ backgroundColor: viewingTenant.branding.primaryColor }}
                            />
                            <span className="text-sm">主色</span>
                          </div>
                        )}
                        {viewingTenant.branding.accentColor && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded border"
                              style={{ backgroundColor: viewingTenant.branding.accentColor }}
                            />
                            <span className="text-sm">强调色</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="usage" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    {/* Links Usage */}
                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">链接数量</span>
                        <span className="text-sm text-gray-500">
                          {formatNumber(viewingTenant.usage.linksUsed)} / {formatNumber(viewingTenant.usage.linksLimit)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(
                            getUsagePercentage(viewingTenant.usage.linksUsed, viewingTenant.usage.linksLimit)
                          )}`}
                          style={{
                            width: `${getUsagePercentage(
                              viewingTenant.usage.linksUsed,
                              viewingTenant.usage.linksLimit
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Clicks Usage */}
                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">点击次数</span>
                        <span className="text-sm text-gray-500">
                          {formatNumber(viewingTenant.usage.clicksUsed)} / {formatNumber(viewingTenant.usage.clicksLimit)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(
                            getUsagePercentage(viewingTenant.usage.clicksUsed, viewingTenant.usage.clicksLimit)
                          )}`}
                          style={{
                            width: `${getUsagePercentage(
                              viewingTenant.usage.clicksUsed,
                              viewingTenant.usage.clicksLimit
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Users Usage */}
                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">用户数量</span>
                        <span className="text-sm text-gray-500">
                          {viewingTenant.usage.usersUsed} / {viewingTenant.usage.usersLimit}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(
                            getUsagePercentage(viewingTenant.usage.usersUsed, viewingTenant.usage.usersLimit)
                          )}`}
                          style={{
                            width: `${getUsagePercentage(
                              viewingTenant.usage.usersUsed,
                              viewingTenant.usage.usersLimit
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* API Calls */}
                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">API 调用</span>
                        <span className="text-sm text-gray-500">
                          {formatNumber(viewingTenant.usage.apiCallsUsed)} / {formatNumber(viewingTenant.usage.apiCallsLimit)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(
                            getUsagePercentage(viewingTenant.usage.apiCallsUsed, viewingTenant.usage.apiCallsLimit)
                          )}`}
                          style={{
                            width: `${getUsagePercentage(
                              viewingTenant.usage.apiCallsUsed,
                              viewingTenant.usage.apiCallsLimit
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    调整配额限制
                  </Button>
                </TabsContent>

                <TabsContent value="features" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Palette className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">白标</p>
                          <p className="text-sm text-gray-500">自定义品牌和外观</p>
                        </div>
                      </div>
                      <Switch checked={viewingTenant.features.whiteLabel} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">自定义域名</p>
                          <p className="text-sm text-gray-500">使用自己的域名</p>
                        </div>
                      </div>
                      <Switch checked={viewingTenant.features.customDomains} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">API 访问</p>
                          <p className="text-sm text-gray-500">通过 API 集成</p>
                        </div>
                      </div>
                      <Switch checked={viewingTenant.features.apiAccess} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">SSO 单点登录</p>
                          <p className="text-sm text-gray-500">SAML/OIDC 集成</p>
                        </div>
                      </div>
                      <Switch checked={viewingTenant.features.sso} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-indigo-600" />
                        <div>
                          <p className="font-medium">高级分析</p>
                          <p className="text-sm text-gray-500">详细的数据分析</p>
                        </div>
                      </div>
                      <Switch checked={viewingTenant.features.advancedAnalytics} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="mt-4 space-y-4">
                  {viewingTenant.settings && (
                    <div className="space-y-4">
                      <div className="rounded-lg border p-4">
                        <h4 className="mb-3 font-medium">区域设置</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">时区</p>
                            <p className="font-medium">{viewingTenant.settings.timezone}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">日期格式</p>
                            <p className="font-medium">{viewingTenant.settings.dateFormat}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">语言</p>
                            <p className="font-medium">{viewingTenant.settings.language.toUpperCase()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex gap-2 border-t pt-4">
                <Button variant="outline" className="flex-1" onClick={() => handleEditTenant(viewingTenant)}>
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </Button>
                <Button
                  variant={viewingTenant.status === 'active' ? 'outline' : 'default'}
                  className="flex-1"
                  onClick={() => handleToggleStatus(viewingTenant)}
                >
                  {viewingTenant.status === 'active' ? (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      暂停
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      激活
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    handleDelete(viewingTenant);
                    setViewingTenant(null);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Tenant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建租户</DialogTitle>
            <DialogDescription>创建一个新的企业租户账户</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">租户名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">租户标识</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="acme-corp"
              />
              <p className="text-xs text-gray-500">将用于子域名: {formData.slug || 'xxx'}.{SHORT_LINK_DOMAIN}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">所有者邮箱</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                placeholder="admin@acme.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">套餐</Label>
              <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">免费版</SelectItem>
                  <SelectItem value="core">核心版</SelectItem>
                  <SelectItem value="growth">成长版</SelectItem>
                  <SelectItem value="premium">高级版</SelectItem>
                  <SelectItem value="enterprise">企业版</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setShowCreateDialog(false)}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑租户</DialogTitle>
            <DialogDescription>修改租户信息和配置</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">租户名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan">套餐</Label>
              <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">免费版</SelectItem>
                  <SelectItem value="core">核心版</SelectItem>
                  <SelectItem value="growth">成长版</SelectItem>
                  <SelectItem value="premium">高级版</SelectItem>
                  <SelectItem value="enterprise">企业版</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>配额限制</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">链接数量</Label>
                  <Input
                    type="number"
                    value={formData.usage.linksLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage: { ...formData.usage, linksLimit: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">点击次数</Label>
                  <Input
                    type="number"
                    value={formData.usage.clicksLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage: { ...formData.usage, clicksLimit: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">用户数量</Label>
                  <Input
                    type="number"
                    value={formData.usage.usersLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage: { ...formData.usage, usersLimit: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">API 调用</Label>
                  <Input
                    type="number"
                    value={formData.usage.apiCallsLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage: { ...formData.usage, apiCallsLimit: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTenant(null)}>
              取消
            </Button>
            <Button onClick={() => setEditingTenant(null)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
