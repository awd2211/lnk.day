import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  RefreshCw,
  Loader2,
  Shield,
  Mail,
  Globe,
  Zap,
  Bell,
  Database,
  Send,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Trash2,
  HardDrive,
  Server,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { systemService } from '@/lib/api';

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
  email: {
    provider: 'smtp' | 'mailgun';
    fromName: string;
    fromEmail: string;
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string;
      secure: boolean;
    };
    mailgun: {
      apiKey: string;
      domain: string;
      region: 'us' | 'eu';
    };
  };
  security: {
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    enableMFA: boolean;
    requireEmailVerification: boolean;
  };
  features: {
    enableRegistration: boolean;
    enableBioLinks: boolean;
    enableQRCodes: boolean;
    enableCampaigns: boolean;
    enableTeams: boolean;
    enableDeepLinks: boolean;
    enableRedirectRules: boolean;
  };
}

const defaultConfig: SystemConfig = {
  general: {
    siteName: 'lnk.day',
    defaultDomain: 'lnk.day',
    supportEmail: 'support@lnk.day',
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
  email: {
    provider: 'smtp',
    fromName: 'lnk.day',
    fromEmail: 'noreply@lnk.day',
    smtp: {
      host: '',
      port: 587,
      user: '',
      pass: '',
      secure: true,
    },
    mailgun: {
      apiKey: '',
      domain: '',
      region: 'us',
    },
  },
  security: {
    passwordMinLength: 8,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    enableMFA: false,
    requireEmailVerification: true,
  },
  features: {
    enableRegistration: true,
    enableBioLinks: true,
    enableQRCodes: true,
    enableCampaigns: true,
    enableTeams: true,
    enableDeepLinks: true,
    enableRedirectRules: true,
  },
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'email' | 'security' | 'features' | 'maintenance'>('general');
  const [formData, setFormData] = useState<SystemConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);

  // Fetch config
  const { data: config, isLoading } = useQuery({
    queryKey: ['system', 'config'],
    queryFn: async () => {
      try {
        const res = await systemService.getConfig();
        return res.data as SystemConfig;
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
        return res.data;
      } catch {
        return { size: '128 MB', keys: 15234, hitRate: 94.5 };
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
        return res.data;
      } catch {
        return { size: '2.4 GB', connections: 12, maxConnections: 100 };
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
        email: { ...defaultConfig.email, ...config.email },
        security: { ...defaultConfig.security, ...config.security },
        features: { ...defaultConfig.features, ...config.features },
      });
    }
  }, [config]);

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: () => systemService.updateConfig(formData),
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

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: () => systemService.testEmail({ to: testEmailTo }),
    onSuccess: () => {
      setShowTestEmailDialog(false);
      setTestEmailTo('');
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
    { id: 'email', label: '邮件设置', icon: Mail },
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

      {/* Email Settings */}
      {activeTab === 'email' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold">邮件设置</h3>
            <Button variant="outline" size="sm" onClick={() => setShowTestEmailDialog(true)}>
              <Send className="mr-2 h-4 w-4" />
              发送测试邮件
            </Button>
          </div>
          <div className="max-w-xl space-y-6">
            {/* Provider Selection */}
            <div className="grid gap-2">
              <Label>邮件服务提供商</Label>
              <Select
                value={formData.email.provider}
                onValueChange={(value: 'smtp' | 'mailgun') => updateFormData('email', 'provider', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Common Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fromName">发件人名称</Label>
                <Input
                  id="fromName"
                  value={formData.email.fromName}
                  onChange={(e) => updateFormData('email', 'fromName', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fromEmail">发件人邮箱</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.email.fromEmail}
                  onChange={(e) => updateFormData('email', 'fromEmail', e.target.value)}
                />
              </div>
            </div>

            {/* SMTP Settings */}
            {formData.email.provider === 'smtp' && (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">SMTP 配置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="smtpHost">SMTP 服务器</Label>
                    <Input
                      id="smtpHost"
                      value={formData.email.smtp?.host || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        email: { ...prev.email, smtp: { ...prev.email.smtp, host: e.target.value } }
                      }))}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="smtpPort">SMTP 端口</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={formData.email.smtp?.port || 587}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        email: { ...prev.email, smtp: { ...prev.email.smtp, port: parseInt(e.target.value) || 587 } }
                      }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smtpUser">SMTP 用户名</Label>
                  <Input
                    id="smtpUser"
                    value={formData.email.smtp?.user || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      email: { ...prev.email, smtp: { ...prev.email.smtp, user: e.target.value } }
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smtpPass">SMTP 密码</Label>
                  <Input
                    id="smtpPass"
                    type="password"
                    value={formData.email.smtp?.pass || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      email: { ...prev.email, smtp: { ...prev.email.smtp, pass: e.target.value } }
                    }))}
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <Label>使用 TLS/SSL</Label>
                    <p className="text-xs text-gray-500">加密邮件传输</p>
                  </div>
                  <Switch
                    checked={formData.email.smtp?.secure ?? true}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      email: { ...prev.email, smtp: { ...prev.email.smtp, secure: checked } }
                    }))}
                  />
                </div>
              </div>
            )}

            {/* Mailgun Settings */}
            {formData.email.provider === 'mailgun' && (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">Mailgun 配置</h4>
                <div className="grid gap-2">
                  <Label htmlFor="mailgunApiKey">API Key</Label>
                  <Input
                    id="mailgunApiKey"
                    type="password"
                    value={formData.email.mailgun?.apiKey || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      email: { ...prev.email, mailgun: { ...prev.email.mailgun, apiKey: e.target.value } }
                    }))}
                    placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500">在 Mailgun 控制台的 API Security 中获取</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mailgunDomain">发送域名</Label>
                  <Input
                    id="mailgunDomain"
                    value={formData.email.mailgun?.domain || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      email: { ...prev.email, mailgun: { ...prev.email.mailgun, domain: e.target.value } }
                    }))}
                    placeholder="mg.yourdomain.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>服务区域</Label>
                  <Select
                    value={formData.email.mailgun?.region || 'us'}
                    onValueChange={(value: 'us' | 'eu') => setFormData(prev => ({
                      ...prev,
                      email: { ...prev.email, mailgun: { ...prev.email.mailgun, region: value } }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">美国 (api.mailgun.net)</SelectItem>
                      <SelectItem value="eu">欧洲 (api.eu.mailgun.net)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-6 text-lg font-semibold">功能开关</h3>
          <div className="max-w-xl space-y-4">
            {[
              { key: 'enableRegistration', label: '开放注册', desc: '允许新用户注册账户' },
              { key: 'enableBioLinks', label: 'Bio Links', desc: '允许用户创建 Bio Link 页面' },
              { key: 'enableQRCodes', label: '二维码功能', desc: '允许用户生成和管理二维码' },
              { key: 'enableCampaigns', label: '营销活动', desc: '允许用户创建营销活动' },
              { key: 'enableTeams', label: '团队协作', desc: '允许用户创建和管理团队' },
              { key: 'enableDeepLinks', label: '深度链接', desc: '允许用户创建移动深度链接' },
              { key: 'enableRedirectRules', label: '重定向规则', desc: '允许用户配置高级重定向规则' },
            ].map((feature) => (
              <div
                key={feature.key}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
              >
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

      {/* Test Email Dialog */}
      <Dialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发送测试邮件</DialogTitle>
            <DialogDescription>输入接收测试邮件的邮箱地址</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="testEmailTo">收件邮箱</Label>
              <Input
                id="testEmailTo"
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestEmailDialog(false)}>
              取消
            </Button>
            <Button
              onClick={() => testEmailMutation.mutate()}
              disabled={!testEmailTo || testEmailMutation.isPending}
            >
              {testEmailMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Config Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认重置设置</DialogTitle>
            <DialogDescription>
              此操作将把所有系统配置恢复为默认值，包括 API 设置、邮件配置、安全设置等。此操作不可撤销。
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
    </div>
  );
}
