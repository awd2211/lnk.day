import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  User,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Copy,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  otpAuthUrl: string;
}

export default function AdminProfilePage() {
  const queryClient = useQueryClient();

  // Profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await profileService.getProfile();
      return res.data as Profile;
    },
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [profileEditing, setProfileEditing] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 2FA state
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [regenerateCode, setRegenerateCode] = useState('');
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) => profileService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setProfileEditing(false);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      profileService.changePassword(data),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
  });

  const setupTwoFactorMutation = useMutation({
    mutationFn: () => profileService.setupTwoFactor(),
    onSuccess: (res) => {
      setTwoFactorSetup(res.data);
    },
  });

  const verifyTwoFactorMutation = useMutation({
    mutationFn: (code: string) => profileService.verifyTwoFactor(code),
    onSuccess: (res) => {
      setTwoFactorSetup(null);
      setVerifyCode('');
      setBackupCodes(res.data.backupCodes);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const disableTwoFactorMutation = useMutation({
    mutationFn: (code: string) => profileService.disableTwoFactor(code),
    onSuccess: () => {
      setShowDisableDialog(false);
      setDisableCode('');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: (code: string) => profileService.regenerateBackupCodes(code),
    onSuccess: (res) => {
      setShowRegenerateDialog(false);
      setRegenerateCode('');
      setBackupCodes(res.data.backupCodes);
    },
  });

  const handleStartEdit = () => {
    if (profile) {
      setProfileForm({ name: profile.name, email: profile.email });
      setProfileEditing(true);
    }
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('新密码与确认密码不一致');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      alert('新密码至少需要8个字符');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>个人信息</CardTitle>
              <CardDescription>管理您的账户基本信息</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profileEditing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存
                </Button>
                <Button variant="outline" onClick={() => setProfileEditing(false)}>
                  取消
                </Button>
              </div>
              {updateProfileMutation.isError && (
                <p className="text-sm text-red-500">
                  {(updateProfileMutation.error as any)?.response?.data?.message || '更新失败'}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">姓名</p>
                  <p className="font-medium">{profile?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">邮箱</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">角色</p>
                  <p className="font-medium">{profile?.role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">上次登录</p>
                  <p className="font-medium">
                    {profile?.lastLoginAt
                      ? new Date(profile.lastLoginAt).toLocaleString('zh-CN')
                      : '-'}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleStartEdit}>
                编辑信息
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>定期更换密码以保护账户安全</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              更新密码
            </Button>
            {changePasswordMutation.isSuccess && (
              <p className="text-sm text-green-500">密码修改成功</p>
            )}
            {changePasswordMutation.isError && (
              <p className="text-sm text-red-500">
                {(changePasswordMutation.error as any)?.response?.data?.message || '密码修改失败'}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-white",
              profile?.twoFactorEnabled ? "bg-green-500" : "bg-gray-400"
            )}>
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                双因素认证 (2FA)
                {profile?.twoFactorEnabled && (
                  <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    已启用
                  </span>
                )}
              </CardTitle>
              <CardDescription>使用身份验证器应用增强账户安全</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profile?.twoFactorEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-700">双因素认证已启用，您的账户更加安全</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateDialog(true)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新生成备用码
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  禁用 2FA
                </Button>
              </div>
            </div>
          ) : twoFactorSetup ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">设置双因素认证</p>
                  <p>请使用身份验证器应用（如 Google Authenticator、Authy）扫描下方二维码</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center p-4 border rounded-lg bg-white">
                  <img src={twoFactorSetup.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  <p className="text-xs text-muted-foreground mt-2">扫描二维码</p>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-muted-foreground">或手动输入密钥</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                        {twoFactorSetup.secret}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(twoFactorSetup.secret)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verifyCode">输入验证码完成设置</Label>
                    <div className="flex gap-2">
                      <Input
                        id="verifyCode"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="6位数字"
                        maxLength={6}
                        className="w-32"
                      />
                      <Button
                        onClick={() => verifyTwoFactorMutation.mutate(verifyCode)}
                        disabled={verifyCode.length !== 6 || verifyTwoFactorMutation.isPending}
                      >
                        {verifyTwoFactorMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        验证并启用
                      </Button>
                    </div>
                    {verifyTwoFactorMutation.isError && (
                      <p className="text-sm text-red-500">
                        {(verifyTwoFactorMutation.error as any)?.response?.data?.message || '验证失败'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button variant="ghost" onClick={() => setTwoFactorSetup(null)}>
                取消
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                双因素认证可以为您的账户添加额外的安全层。启用后，登录时除了密码外，
                还需要输入身份验证器应用生成的一次性代码。
              </p>
              <Button onClick={() => setupTwoFactorMutation.mutate()}>
                {setupTwoFactorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                启用双因素认证
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Codes Display */}
      {backupCodes && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">备用码</CardTitle>
            <CardDescription className="text-green-600">
              请妥善保存这些备用码，当您无法使用身份验证器时可以使用备用码登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {backupCodes.map((code, index) => (
                <code
                  key={index}
                  className="px-3 py-2 bg-white rounded text-center font-mono text-sm"
                >
                  {code}
                </code>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制所有
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setBackupCodes(null)}>
                关闭
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disable 2FA Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>禁用双因素认证</AlertDialogTitle>
            <AlertDialogDescription>
              禁用双因素认证会降低您账户的安全性。请输入当前的验证码或备用码确认操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="disableCode">验证码</Label>
            <Input
              id="disableCode"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="6位数字或备用码"
              className="mt-2"
            />
            {disableTwoFactorMutation.isError && (
              <p className="text-sm text-red-500 mt-2">
                {(disableTwoFactorMutation.error as any)?.response?.data?.message || '验证失败'}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisableCode('')}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableTwoFactorMutation.mutate(disableCode)}
              disabled={!disableCode || disableTwoFactorMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {disableTwoFactorMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Backup Codes Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重新生成备用码</AlertDialogTitle>
            <AlertDialogDescription>
              重新生成备用码后，之前的备用码将全部失效。请输入当前的验证码确认操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="regenerateCode">验证码</Label>
            <Input
              id="regenerateCode"
              value={regenerateCode}
              onChange={(e) => setRegenerateCode(e.target.value)}
              placeholder="6位数字"
              maxLength={6}
              className="mt-2"
            />
            {regenerateBackupCodesMutation.isError && (
              <p className="text-sm text-red-500 mt-2">
                {(regenerateBackupCodesMutation.error as any)?.response?.data?.message || '验证失败'}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRegenerateCode('')}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateBackupCodesMutation.mutate(regenerateCode)}
              disabled={regenerateCode.length !== 6 || regenerateBackupCodesMutation.isPending}
            >
              {regenerateBackupCodesMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认重新生成
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
