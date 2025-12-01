import { useState } from 'react';
import { User, Lock, Key, Save, CheckCircle, AlertCircle, Mail } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/api';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';
import { TwoFactorSetup } from '@/components/settings/TwoFactorSetup';
import { PasswordStrengthIndicator, calculatePasswordStrength } from '@/components/settings/PasswordStrengthIndicator';

type Tab = 'profile' | 'security' | 'api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { user, updateUser, logout } = useAuth();
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
  const [isSendingVerification, setIsSendingVerification] = useState(false);

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

  const handleSendVerificationEmail = async () => {
    setIsSendingVerification(true);
    try {
      await authService.sendVerificationEmail();
      toast({ title: '验证邮件已发送', description: '请检查您的邮箱' });
    } catch (error: any) {
      toast({
        title: '发送失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword) {
      toast({ title: '请输入当前密码', variant: 'destructive' });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: '两次输入的密码不匹配', variant: 'destructive' });
      return;
    }

    // 使用密码强度检测验证
    const strengthResult = calculatePasswordStrength(passwords.newPassword);

    // 检查基本要求
    const basicRequirements = strengthResult.requirements.slice(0, 4); // minLength, hasLower, hasUpper, hasDigit
    const unmetRequirements = basicRequirements.filter(r => !r.met);

    if (unmetRequirements.length > 0) {
      toast({
        title: '密码不符合要求',
        description: unmetRequirements.map(r => r.label).join('；'),
        variant: 'destructive'
      });
      return;
    }

    // 密码强度太弱
    if (strengthResult.score < 30) {
      toast({
        title: '密码强度太弱',
        description: '请创建一个更复杂的密码',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast({
        title: '密码已更新',
        description: '您的密码已成功修改，请重新登录'
      });
      // 密码修改成功后自动注销，让用户重新登录
      setTimeout(() => {
        logout();
      }, 1500);
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
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-6 text-lg font-semibold dark:text-white">个人资料</h2>
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
                  <div className="mt-2 flex items-center gap-2">
                    {user?.emailVerifiedAt ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          邮箱已验证
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-600 dark:text-amber-400">
                          邮箱未验证
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSendVerificationEmail}
                          disabled={isSendingVerification}
                          className="ml-2"
                        >
                          <Mail className="mr-1 h-3 w-3" />
                          {isSendingVerification ? '发送中...' : '发送验证邮件'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* 2FA Section */}
              <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                <TwoFactorSetup />
              </div>

              {/* Password Section */}
              <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                <h2 className="mb-6 text-lg font-semibold dark:text-white">修改密码</h2>
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
                    {passwords.newPassword && (
                      <div className="mt-3">
                        <PasswordStrengthIndicator password={passwords.newPassword} />
                      </div>
                    )}
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
            </div>
          )}

          {activeTab === 'api' && (
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <ApiKeyManager />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
