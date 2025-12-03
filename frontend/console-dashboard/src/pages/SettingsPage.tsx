import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  RefreshCw,
  Loader2,
  Shield,
  Globe,
  Zap,
  Bell,
  Database,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Trash2,
  HardDrive,
  Server,
  Upload,
  Archive,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { systemService } from '@/lib/api';
import { SHORT_LINK_DOMAIN } from '@/lib/config';

interface SystemConfig {
  general: {
    siteName: string;
    defaultDomain: string;
    supportEmail: string;
    timezone: string;
    language: string;
  };
  api: {
    rateLimit: number;
    maxLinksPerUser: number;
    maxQRPerUser: number;
    enablePublicAPI: boolean;
    apiKeyExpiry: number;
  };
  // 邮件设置已移至"通知管理 → 渠道配置"
  security: {
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    enableMFA: boolean;
    requireEmailVerification: boolean;
  };
  features: {
    // 用户与团队
    enableRegistration: boolean;
    enableTeams: boolean;
    // 链接功能
    enableBioLinks: boolean;
    enableQRCodes: boolean;
    enableDeepLinks: boolean;
    enableRedirectRules: boolean;
    enableFolders: boolean;
    enableTags: boolean;
    // 营销功能
    enableCampaigns: boolean;
    enableAbTests: boolean;
    enableGoals: boolean;
    enableUtmTemplates: boolean;
    // 高级功能
    enablePages: boolean;
    enableWebhooks: boolean;
    enableIntegrations: boolean;
    enableAutomation: boolean;
    // 监控与安全
    enableRealtime: boolean;
    enableAlerts: boolean;
    enableSso: boolean;
    enableSecurityScan: boolean;
    enableContentModeration: boolean;
    // 内容管理
    enableComments: boolean;
    enableSeoManager: boolean;
  };
}

const defaultConfig: SystemConfig = {
  general: {
    siteName: SHORT_LINK_DOMAIN,
    defaultDomain: SHORT_LINK_DOMAIN,
    supportEmail: `support@${SHORT_LINK_DOMAIN}`,
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
  },
  api: {
    rateLimit: 60,
    maxLinksPerUser: 1000,
    maxQRPerUser: 100,
    enablePublicAPI: true,
    apiKeyExpiry: 365,
  },
  // 邮件设置已移至"通知管理 → 渠道配置"
  security: {
    passwordMinLength: 8,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    enableMFA: false,
    requireEmailVerification: true,
  },
  features: {
    // 用户与团队
    enableRegistration: true,
    enableTeams: true,
    // 链接功能
    enableBioLinks: true,
    enableQRCodes: true,
    enableDeepLinks: true,
    enableRedirectRules: true,
    enableFolders: true,
    enableTags: true,
    // 营销功能
    enableCampaigns: true,
    enableAbTests: true,
    enableGoals: true,
    enableUtmTemplates: true,
    // 高级功能
    enablePages: true,
    enableWebhooks: true,
    enableIntegrations: true,
    enableAutomation: true,
    // 监控与安全
    enableRealtime: true,
    enableAlerts: true,
    enableSso: false,
    enableSecurityScan: true,
    enableContentModeration: true,
    // 内容管理
    enableComments: true,
    enableSeoManager: true,
  },
};


export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'security' | 'features' | 'maintenance'>('general');
  const [formData, setFormData] = useState<SystemConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [restoreBackupTarget, setRestoreBackupTarget] = useState<any | null>(null);

  // Fetch config (不再获取邮件设置，已移至通知管理)
  const { data: config, isLoading } = useQuery({
    queryKey: ['system', 'config'],
    queryFn: async () => {
      try {
        const configRes = await systemService.getConfig();
        const configData = configRes.data as Partial<SystemConfig>;
        return {
          ...defaultConfig,
          ...configData,
        } as SystemConfig;
      } catch {
        return defaultConfig;
      }
    },
  });

  // Fetch cache info
  const { data: cacheInfo } = useQuery({
    queryKey: ['system', 'cache'],
    queryFn: async () => {
      try {
        const res = await systemService.getCache();
        const redis = res.data?.redis;
        if (redis) {
          const hits = redis.hits || 0;
          const misses = redis.misses || 0;
          const hitRate = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(1) : 0;
          return {
            size: redis.memory?.used || '0 MB',
            keys: redis.keys || 0,
            hitRate: hitRate,
          };
        }
        return { size: '0 MB', keys: 0, hitRate: 0 };
      } catch {
        return { size: '-', keys: 0, hitRate: 0 };
      }
    },
    enabled: activeTab === 'maintenance',
  });

  // Fetch database info
  const { data: dbInfo } = useQuery({
    queryKey: ['system', 'database'],
    queryFn: async () => {
      try {
        const res = await systemService.getDatabase();
        const postgres = res.data?.postgres;
        if (postgres) {
          return {
            size: postgres.databaseSize || '0 MB',
            connections: postgres.activeConnections || 0,
            maxConnections: postgres.maxConnections || 100,
          };
        }
        return { size: '0 MB', connections: 0, maxConnections: 100 };
      } catch {
        return { size: '-', connections: 0, maxConnections: 100 };
      }
    },
    enabled: activeTab === 'maintenance',
  });

  useEffect(() => {
    if (config) {
      // Merge with defaultConfig to ensure all properties exist
      setFormData({
        general: { ...defaultConfig.general, ...config.general },
        api: { ...defaultConfig.api, ...config.api },
        security: { ...defaultConfig.security, ...config.security },
        features: { ...defaultConfig.features, ...config.features },
      });
    }
  }, [config]);

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await systemService.updateConfig(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'config'] });
      setHasChanges(false);
    },
  });

  // Reset config mutation
  const resetMutation = useMutation({
    mutationFn: () => systemService.resetConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'config'] });
      setFormData(defaultConfig);
      setShowResetDialog(false);
    },
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => systemService.clearCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'cache'] });
      setShowClearCacheDialog(false);
    },
  });

  // Fetch backups
  const { data: backups, isLoading: backupsLoading } = useQuery({
    queryKey: ['system', 'backups'],
    queryFn: async () => {
      try {
        const res = await systemService.getBackups();
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: activeTab === 'maintenance',
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: () => systemService.createBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'backups'] });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (id: string) => systemService.restoreBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'backups'] });
      setRestoreBackupTarget(null);
    },
  });

  // 邮件模板已移至"通知管理 → 通知模板"

  const updateFormData = (section: keyof SystemConfig, key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setHasChanges(true);
  };

  const tabs = [
    { id: 'general', label: '常规设置', icon: Globe },
    { id: 'api', label: 'API 设置', icon: Zap },
    // 邮件设置已移至"通知管理 → 渠道配置"
    // 邮件模板已移至"通知管理 → 通知模板"
    { id: 'security', label: '安全设置', icon: Shield },
    { id: 'features', label: '功能开关', icon: Bell },
    { id: 'maintenance', label: '系统维护', icon: Server },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-6 text-lg font-semibold">常规设置</h3>
          <div className="max-w-xl space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="siteName">站点名称</Label>
              <Input
                id="siteName"
                value={formData.general.siteName}
                onChange={(e) => updateFormData('general', 'siteName', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultDomain">默认域名</Label>
              <Input
                id="defaultDomain"
                value={formData.general.defaultDomain}
                onChange={(e) => updateFormData('general', 'defaultDomain', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supportEmail">客服邮箱</Label>
              <Input
                id="supportEmail"
                type="email"
                value={formData.general.supportEmail}
                onChange={(e) => updateFormData('general', 'supportEmail', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">时区</Label>
              <Select
                value={formData.general.timezone}
                onValueChange={(value) => updateFormData('general', 'timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (UTC-8)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="language">默认语言</Label>
              <Select
                value={formData.general.language}
                onValueChange={(value) => updateFormData('general', 'language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="zh-TW">繁體中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                  <SelectItem value="ja-JP">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* API Settings */}
      {activeTab === 'api' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-6 text-lg font-semibold">API 设置</h3>
          <div className="max-w-xl space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="rateLimit">API 请求限制 (每分钟)</Label>
              <Input
                id="rateLimit"
                type="number"
                value={formData.api.rateLimit}
                onChange={(e) => updateFormData('api', 'rateLimit', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxLinksPerUser">每用户最大链接数</Label>
              <Input
                id="maxLinksPerUser"
                type="number"
                value={formData.api.maxLinksPerUser}
                onChange={(e) => updateFormData('api', 'maxLinksPerUser', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxQRPerUser">每用户最大二维码数</Label>
              <Input
                id="maxQRPerUser"
                type="number"
                value={formData.api.maxQRPerUser}
                onChange={(e) => updateFormData('api', 'maxQRPerUser', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apiKeyExpiry">API 密钥有效期 (天)</Label>
              <Input
                id="apiKeyExpiry"
                type="number"
                value={formData.api.apiKeyExpiry}
                onChange={(e) => updateFormData('api', 'apiKeyExpiry', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500">设置为 0 表示永不过期</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <Label>开放公开 API</Label>
                <p className="text-xs text-gray-500">允许用户通过 API 密钥访问</p>
              </div>
              <Switch
                checked={formData.api.enablePublicAPI}
                onCheckedChange={(checked) => updateFormData('api', 'enablePublicAPI', checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-6 text-lg font-semibold">安全设置</h3>
          <div className="max-w-xl space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="passwordMinLength">密码最小长度</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={formData.security.passwordMinLength}
                onChange={(e) => updateFormData('security', 'passwordMinLength', parseInt(e.target.value) || 8)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sessionTimeout">会话超时时间 (小时)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={formData.security.sessionTimeout}
                onChange={(e) => updateFormData('security', 'sessionTimeout', parseInt(e.target.value) || 24)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maxLoginAttempts">最大登录尝试次数</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={formData.security.maxLoginAttempts}
                  onChange={(e) => updateFormData('security', 'maxLoginAttempts', parseInt(e.target.value) || 5)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lockoutDuration">锁定时长 (分钟)</Label>
                <Input
                  id="lockoutDuration"
                  type="number"
                  value={formData.security.lockoutDuration}
                  onChange={(e) => updateFormData('security', 'lockoutDuration', parseInt(e.target.value) || 30)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <Label>强制多因素认证</Label>
                <p className="text-xs text-gray-500">要求所有用户启用 MFA</p>
              </div>
              <Switch
                checked={formData.security.enableMFA}
                onCheckedChange={(checked) => updateFormData('security', 'enableMFA', checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <Label>要求邮箱验证</Label>
                <p className="text-xs text-gray-500">新用户必须验证邮箱后才能使用</p>
              </div>
              <Switch
                checked={formData.security.requireEmailVerification}
                onCheckedChange={(checked) => updateFormData('security', 'requireEmailVerification', checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Feature Toggles */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* 用户与团队 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">用户与团队</h3>
            <div className="space-y-3">
              {[
                { key: 'enableRegistration', label: '开放注册', desc: '允许新用户注册账户' },
                { key: 'enableTeams', label: '团队协作', desc: '允许用户创建和管理团队' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <Label>{feature.label}</Label>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                  <Switch
                    checked={(formData.features as any)[feature.key] ?? true}
                    onCheckedChange={(checked) => updateFormData('features', feature.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 链接功能 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">链接功能</h3>
            <div className="space-y-3">
              {[
                { key: 'enableBioLinks', label: 'Bio Links', desc: '允许用户创建 Bio Link 页面' },
                { key: 'enableQRCodes', label: '二维码功能', desc: '允许用户生成和管理二维码' },
                { key: 'enableDeepLinks', label: '深度链接', desc: '允许用户创建移动应用深度链接' },
                { key: 'enableRedirectRules', label: '重定向规则', desc: '允许用户配置高级重定向规则' },
                { key: 'enableFolders', label: '文件夹管理', desc: '允许用户使用文件夹组织链接' },
                { key: 'enableTags', label: '标签系统', desc: '允许用户使用标签分类链接' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <Label>{feature.label}</Label>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                  <Switch
                    checked={(formData.features as any)[feature.key] ?? true}
                    onCheckedChange={(checked) => updateFormData('features', feature.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 营销功能 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">营销功能</h3>
            <div className="space-y-3">
              {[
                { key: 'enableCampaigns', label: '营销活动', desc: '允许用户创建和管理营销活动' },
                { key: 'enableAbTests', label: 'A/B 测试', desc: '允许用户进行链接 A/B 测试' },
                { key: 'enableGoals', label: '目标追踪', desc: '允许用户设置和追踪转化目标' },
                { key: 'enableUtmTemplates', label: 'UTM 模板', desc: '允许用户创建 UTM 参数模板' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <Label>{feature.label}</Label>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                  <Switch
                    checked={(formData.features as any)[feature.key] ?? true}
                    onCheckedChange={(checked) => updateFormData('features', feature.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 高级功能 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">高级功能</h3>
            <div className="space-y-3">
              {[
                { key: 'enablePages', label: '落地页', desc: '允许用户创建自定义落地页' },
                { key: 'enableWebhooks', label: 'Webhooks', desc: '允许用户配置 Webhook 回调' },
                { key: 'enableIntegrations', label: '第三方集成', desc: '允许用户连接第三方服务' },
                { key: 'enableAutomation', label: '自动化工作流', desc: '允许用户创建自动化规则' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <Label>{feature.label}</Label>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                  <Switch
                    checked={(formData.features as any)[feature.key] ?? true}
                    onCheckedChange={(checked) => updateFormData('features', feature.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 监控与安全 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">监控与安全</h3>
            <div className="space-y-3">
              {[
                { key: 'enableRealtime', label: '实时监控', desc: '启用实时数据监控面板' },
                { key: 'enableAlerts', label: '告警系统', desc: '启用告警规则和通知' },
                { key: 'enableSso', label: 'SSO 单点登录', desc: '启用企业 SSO 集成' },
                { key: 'enableSecurityScan', label: '安全扫描', desc: '启用链接安全扫描功能' },
                { key: 'enableContentModeration', label: '内容审核', desc: '启用自动内容审核' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <Label>{feature.label}</Label>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                  <Switch
                    checked={(formData.features as any)[feature.key] ?? true}
                    onCheckedChange={(checked) => updateFormData('features', feature.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 内容管理 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">内容管理</h3>
            <div className="space-y-3">
              {[
                { key: 'enableComments', label: '评论系统', desc: '启用页面评论功能' },
                { key: 'enableSeoManager', label: 'SEO 管理', desc: '启用 SEO 优化工具' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <Label>{feature.label}</Label>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                  <Switch
                    checked={(formData.features as any)[feature.key] ?? true}
                    onCheckedChange={(checked) => updateFormData('features', feature.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Cache Info */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">缓存管理</h3>
              <Button variant="outline" size="sm" onClick={() => setShowClearCacheDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                清除缓存
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500">缓存大小</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{cacheInfo?.size || '-'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500">缓存键数量</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{cacheInfo?.keys?.toLocaleString() || '-'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500">命中率</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{cacheInfo?.hitRate ? `${cacheInfo.hitRate}%` : '-'}</p>
              </div>
            </div>
          </div>

          {/* Database Info */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">数据库状态</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500">数据库大小</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{dbInfo?.size || '-'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500">活跃连接</span>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {dbInfo?.connections || 0} / {dbInfo?.maxConnections || 100}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  {(dbInfo?.connections || 0) < (dbInfo?.maxConnections || 100) * 0.8 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="text-sm text-gray-500">状态</span>
                </div>
                <Badge
                  className={
                    (dbInfo?.connections || 0) < (dbInfo?.maxConnections || 100) * 0.8
                      ? 'mt-2 bg-green-100 text-green-700'
                      : 'mt-2 bg-yellow-100 text-yellow-700'
                  }
                >
                  {(dbInfo?.connections || 0) < (dbInfo?.maxConnections || 100) * 0.8 ? '正常' : '连接较多'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Backup Management */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">备份管理</h3>
              <Button
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
              >
                {createBackupMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                创建备份
              </Button>
            </div>

            {backupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : backups?.length ? (
              <div className="space-y-3">
                {backups.map((backup: any) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-blue-100 p-2">
                        <Database className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{backup.database || 'Database'}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(backup.createdAt).toLocaleString('zh-CN')}
                          </span>
                          <span>{backup.size}</span>
                          <Badge
                            className={
                              backup.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : backup.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }
                          >
                            {backup.status === 'completed' ? '完成' : backup.status === 'failed' ? '失败' : backup.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreBackupTarget(backup)}
                        disabled={backup.status !== 'completed' || restoreBackupMutation.isPending}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        恢复
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Archive className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2">暂无备份记录</p>
                <p className="text-sm">点击"创建备份"按钮创建第一个备份</p>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border-2 border-red-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-red-600">危险操作</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">重置所有设置</p>
                <p className="text-sm text-gray-500">将所有配置恢复为默认值，此操作不可撤销</p>
              </div>
              <Button variant="destructive" onClick={() => setShowResetDialog(true)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                重置设置
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button (for config tabs) */}
      {activeTab !== 'maintenance' && (
        <div className="flex items-center justify-between">
          <div>
            {hasChanges && (
              <Badge className="bg-yellow-100 text-yellow-700">
                <AlertTriangle className="mr-1 h-3 w-3" />
                有未保存的更改
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFormData(config || defaultConfig);
                setHasChanges(false);
              }}
              disabled={!hasChanges}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              撤销更改
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasChanges}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              保存设置
            </Button>
          </div>
        </div>
      )}

      {/* Reset Config Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认重置设置</DialogTitle>
            <DialogDescription>
              此操作将把所有系统配置恢复为默认值，包括 API 设置、安全设置等。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cache Dialog */}
      <Dialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认清除缓存</DialogTitle>
            <DialogDescription>
              清除缓存可能会暂时影响系统性能，因为需要重新构建缓存。是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearCacheDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearCacheMutation.mutate()}
              disabled={clearCacheMutation.isPending}
            >
              {clearCacheMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              确认清除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 恢复备份确认对话框 */}
      <AlertDialog open={!!restoreBackupTarget} onOpenChange={(open) => !open && setRestoreBackupTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复备份</AlertDialogTitle>
            <AlertDialogDescription>
              您即将恢复备份 "{restoreBackupTarget?.database || 'Database'}"（创建于 {restoreBackupTarget?.createdAt ? new Date(restoreBackupTarget.createdAt).toLocaleString('zh-CN') : '-'}）。
              此操作将用备份数据覆盖当前数据库内容，可能导致部分数据丢失。是否确认恢复？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => restoreBackupTarget && restoreBackupMutation.mutate(restoreBackupTarget.id)}
            >
              {restoreBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
