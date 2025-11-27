import { useState } from 'react';
import { User, Lock, Bell, Key, Save } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/api';

type Tab = 'profile' | 'security' | 'api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'profile' as Tab, label: '个人资料', icon: User },
    { id: 'security' as Tab, label: '安全设置', icon: Lock },
    { id: 'api' as Tab, label: 'API 密钥', icon: Key },
  ];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await authService.updateProfile(profile);
      updateUser(profile);
      toast({ title: '保存成功' });
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: '密码不匹配', variant: 'destructive' });
      return;
    }

    if (passwords.newPassword.length < 8) {
      toast({ title: '新密码至少需要 8 个字符', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: '密码已更新' });
    } catch (error: any) {
      toast({
        title: '修改失败',
        description: error.response?.data?.message || '当前密码不正确',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-gray-500">管理您的账户和偏好设置</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-6 text-lg font-semibold">个人资料</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-6 text-lg font-semibold">修改密码</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">当前密码</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) =>
                      setPasswords({ ...passwords, currentPassword: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">新密码</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">确认新密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirmPassword: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleChangePassword} disabled={isSaving}>
                  <Lock className="mr-2 h-4 w-4" />
                  {isSaving ? '更新中...' : '更新密码'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-6 text-lg font-semibold">API 密钥</h2>
              <p className="mb-4 text-sm text-gray-500">
                使用 API 密钥可以通过编程方式访问您的链接数据。请妥善保管您的密钥，不要分享给他人。
              </p>
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">您的 API 密钥</p>
                    <p className="text-sm text-gray-500">创建于 2024-01-01</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      显示密钥
                    </Button>
                    <Button variant="outline" size="sm">
                      重新生成
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button>
                  <Key className="mr-2 h-4 w-4" />
                  创建新密钥
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
