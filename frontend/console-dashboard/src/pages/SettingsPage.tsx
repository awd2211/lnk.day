import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw, Loader2, Shield, Mail, Globe, Zap, Bell, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { systemService, adminAuthService } from '@/lib/api';

interface SystemConfig {
  general: {
    siteName: string;
    defaultDomain: string;
    supportEmail: string;
  };
  api: {
    rateLimit: number;
    maxLinksPerUser: number;
    maxQRPerUser: number;
    enablePublicAPI: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpSecure: boolean;
    fromName: string;
    fromEmail: string;
  };
  security: {
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    enableMFA: boolean;
  };
  features: {
    enableRegistration: boolean;
    enableBioLinks: boolean;
    enableQRCodes: boolean;
    enableCampaigns: boolean;
    enableTeams: boolean;
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['system', 'config'],
    queryFn: () => systemService.getConfig().then((res) => res.data),
  });

  const [formData, setFormData] = useState<Partial<SystemConfig>>({
    general: {
      siteName: 'lnk.day',
      defaultDomain: 'lnk.day',
      supportEmail: 'support@lnk.day',
    },
    api: {
      rateLimit: 60,
      maxLinksPerUser: 1000,
      maxQRPerUser: 100,
      enablePublicAPI: true,
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpSecure: true,
      fromName: 'lnk.day',
      fromEmail: 'noreply@lnk.day',
    },
    security: {
      passwordMinLength: 8,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      enableMFA: false,
    },
    features: {
      enableRegistration: true,
      enableBioLinks: true,
      enableQRCodes: true,
      enableCampaigns: true,
      enableTeams: true,
    },
  });

  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'email' | 'security' | 'features'>('general');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    // In production, this would call an API to save settings
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('设置已保存');
  };

  const tabs = [
    { id: 'general', label: '常规设置', icon: Globe },
    { id: 'api', label: 'API 设置', icon: Zap },
    { id: 'email', label: '邮件设置', icon: Mail },
    { id: 'security', label: '安全设置', icon: Shield },
    { id: 'features', label: '功能开关', icon: Bell },
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
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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
          <div className="space-y-4 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="siteName">站点名称</Label>
              <Input
                id="siteName"
                value={formData.general?.siteName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    general: { ...formData.general!, siteName: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultDomain">默认域名</Label>
              <Input
                id="defaultDomain"
                value={formData.general?.defaultDomain || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    general: { ...formData.general!, defaultDomain: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supportEmail">客服邮箱</Label>
              <Input
                id="supportEmail"
                type="email"
                value={formData.general?.supportEmail || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    general: { ...formData.general!, supportEmail: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* API Settings */}
      {activeTab === 'api' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-6 text-lg font-semibold">API 设置</h3>
          <div className="space-y-4 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="rateLimit">API 请求限制 (每分钟)</Label>
              <Input
                id="rateLimit"
                type="number"
                value={formData.api?.rateLimit || 60}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    api: { ...formData.api!, rateLimit: parseInt(e.target.value) },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxLinksPerUser">每用户最大链接数</Label>
              <Input
                id="maxLinksPerUser"
                type="number"
                value={formData.api?.maxLinksPerUser || 1000}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    api: { ...formData.api!, maxLinksPerUser: parseInt(e.target.value) },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxQRPerUser">每用户最大二维码数</Label>
              <Input
                id="maxQRPerUser"
                type="number"
                value={formData.api?.maxQRPerUser || 100}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    api: { ...formData.api!, maxQRPerUser: parseInt(e.target.value) },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <Label>开放公开 API</Label>
                <p className="text-xs text-gray-500">允许用户通过 API 密钥访问</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={formData.api?.enablePublicAPI ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    api: { ...formData.api!, enablePublicAPI: e.target.checked },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-6 text-lg font-semibold">邮件设置</h3>
          <div className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="smtpHost">SMTP 服务器</Label>
                <Input
                  id="smtpHost"
                  value={formData.email?.smtpHost || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: { ...formData.email!, smtpHost: e.target.value },
                    })
                  }
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="smtpPort">SMTP 端口</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={formData.email?.smtpPort || 587}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: { ...formData.email!, smtpPort: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtpUser">SMTP 用户名</Label>
              <Input
                id="smtpUser"
                value={formData.email?.smtpUser || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: { ...formData.email!, smtpUser: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fromName">发件人名称</Label>
                <Input
                  id="fromName"
                  value={formData.email?.fromName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: { ...formData.email!, fromName: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fromEmail">发件人邮箱</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.email?.fromEmail || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: { ...formData.email!, fromEmail: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <Label>使用 TLS/SSL</Label>
                <p className="text-xs text-gray-500">加密邮件传输</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={formData.email?.smtpSecure ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: { ...formData.email!, smtpSecure: e.target.checked },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-6 text-lg font-semibold">安全设置</h3>
          <div className="space-y-4 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="passwordMinLength">密码最小长度</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={formData.security?.passwordMinLength || 8}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    security: { ...formData.security!, passwordMinLength: parseInt(e.target.value) },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sessionTimeout">会话超时时间 (小时)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={formData.security?.sessionTimeout || 24}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    security: { ...formData.security!, sessionTimeout: parseInt(e.target.value) },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxLoginAttempts">最大登录尝试次数</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                value={formData.security?.maxLoginAttempts || 5}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    security: { ...formData.security!, maxLoginAttempts: parseInt(e.target.value) },
                  })
                }
              />
              <p className="text-xs text-gray-500">超过限制后账户将被临时锁定</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <Label>强制多因素认证</Label>
                <p className="text-xs text-gray-500">要求所有用户启用 MFA</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={formData.security?.enableMFA ?? false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    security: { ...formData.security!, enableMFA: e.target.checked },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Feature Toggles */}
      {activeTab === 'features' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-6 text-lg font-semibold">功能开关</h3>
          <div className="space-y-4 max-w-xl">
            {[
              { key: 'enableRegistration', label: '开放注册', desc: '允许新用户注册账户' },
              { key: 'enableBioLinks', label: 'Bio Links', desc: '允许用户创建 Bio Link 页面' },
              { key: 'enableQRCodes', label: '二维码功能', desc: '允许用户生成和管理二维码' },
              { key: 'enableCampaigns', label: '营销活动', desc: '允许用户创建营销活动' },
              { key: 'enableTeams', label: '团队协作', desc: '允许用户创建和管理团队' },
            ].map((feature) => (
              <div
                key={feature.key}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
              >
                <div>
                  <Label>{feature.label}</Label>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={(formData.features as any)?.[feature.key] ?? true}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: { ...formData.features!, [feature.key]: e.target.checked },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          保存设置
        </Button>
      </div>
    </div>
  );
}
