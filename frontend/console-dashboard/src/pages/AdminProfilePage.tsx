import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
  Mail,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// 密码强度计算函数
function calculatePasswordStrength(password: string): {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
} {
  const checks = [
    { label: '至少8个字符', passed: password.length >= 8 },
    { label: '包含小写字母', passed: /[a-z]/.test(password) },
    { label: '包含大写字母', passed: /[A-Z]/.test(password) },
    { label: '包含数字', passed: /\d/.test(password) },
    { label: '包含特殊字符', passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  let score = checks.filter(c => c.passed).length;

  // 额外加分项
  if (password.length >= 12) score += 0.5;
  if (password.length >= 16) score += 0.5;

  // 常见弱密码扣分
  const weakPasswords = ['password', '12345678', 'qwerty', 'admin123', 'letmein', 'welcome'];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    score = Math.max(0, score - 2);
  }

  // 计算百分比 (最高6分 = 100%)
  const percentage = Math.min(100, (score / 6) * 100);

  let level: 'weak' | 'fair' | 'good' | 'strong';
  let label: string;
  let color: string;

  if (percentage < 40) {
    level = 'weak';
    label = '弱';
    color = 'bg-red-500';
  } else if (percentage < 60) {
    level = 'fair';
    label = '一般';
    color = 'bg-orange-500';
  } else if (percentage < 80) {
    level = 'good';
    label = '良好';
    color = 'bg-yellow-500';
  } else {
    level = 'strong';
    label = '强';
    color = 'bg-green-500';
  }

  return { score: percentage, level, label, color, checks };
}

interface Profile {
  id: string;
  email: string;
  emailVerified: boolean;
  pendingEmail?: string;
  emailChangeOldVerified?: boolean;
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
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await profileService.getProfile();
      return res.data as Profile;
    },
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '' });
  const [profileEditing, setProfileEditing] = useState(false);

  // Email change state
  const [emailChangeForm, setEmailChangeForm] = useState({ newEmail: '', verificationCode: '' });
  const [emailChangeStep, setEmailChangeStep] = useState<'idle' | 'verifying_old' | 'verifying_new'>('idle');

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
    mutationFn: (data: { name?: string }) => profileService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setProfileEditing(false);
    },
  });

  // Email change mutations
  const requestEmailChangeMutation = useMutation({
    mutationFn: (newEmail: string) => profileService.requestEmailChange(newEmail),
    onSuccess: () => {
      setEmailChangeStep('verifying_old');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const verifyOldEmailMutation = useMutation({
    mutationFn: (code: string) => profileService.verifyOldEmailForChange(code),
    onSuccess: () => {
      setEmailChangeStep('verifying_new');
      setEmailChangeForm({ ...emailChangeForm, verificationCode: '' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const resendEmailChangeCodeMutation = useMutation({
    mutationFn: () => profileService.resendEmailChangeCode(),
  });

  const resendNewEmailVerificationMutation = useMutation({
    mutationFn: () => profileService.resendNewEmailVerification(),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      profileService.changePassword(data),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // 密码修改成功后注销并跳转到登录页
      setTimeout(() => {
        logout();
        navigate('/login', { replace: true, state: { message: '密码已修改，请重新登录' } });
      }, 1500);
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

  // Email verification
  const sendEmailVerificationMutation = useMutation({
    mutationFn: () => profileService.sendEmailVerification(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const cancelPendingEmailMutation = useMutation({
    mutationFn: () => profileService.cancelPendingEmailChange(),
    onSuccess: () => {
      setEmailChangeStep('idle');
      setEmailChangeForm({ newEmail: '', verificationCode: '' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const handleStartEdit = () => {
    if (profile) {
      setProfileForm({ name: profile.name });
      setProfileEditing(true);
    }
  };

  // 初始化邮箱更换步骤状态
  const getEmailChangeStep = (): 'idle' | 'verifying_old' | 'verifying_new' => {
    if (!profile?.pendingEmail) return 'idle';
    if (profile.emailChangeOldVerified) return 'verifying_new';
    return 'verifying_old';
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
    const strength = calculatePasswordStrength(passwordForm.newPassword);
    if (strength.level === 'weak') {
      alert('密码强度太弱，请确保包含大小写字母、数字和特殊字符');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  // 计算当前密码强度
  const passwordStrength = passwordForm.newPassword
    ? calculatePasswordStrength(passwordForm.newPassword)
    : null;

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
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
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

      {/* Email Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>邮箱管理</CardTitle>
              <CardDescription>管理您的账户邮箱地址</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 当前邮箱 */}
          <div>
            <p className="text-sm text-muted-foreground">当前邮箱</p>
            <div className="flex items-center gap-2">
              <p className="font-medium">{profile?.email}</p>
              {profile?.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  已验证
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  <XCircle className="h-3 w-3" />
                  未验证
                </span>
              )}
            </div>
            {!profile?.emailVerified && !profile?.pendingEmail && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendEmailVerificationMutation.mutate()}
                  disabled={sendEmailVerificationMutation.isPending}
                >
                  {sendEmailVerificationMutation.isPending ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-3 w-3" />
                  )}
                  发送验证邮件
                </Button>
                {sendEmailVerificationMutation.isSuccess && (
                  <p className="text-xs text-green-600 mt-1">验证邮件已发送，请查收</p>
                )}
                {sendEmailVerificationMutation.isError && (
                  <p className="text-xs text-red-500 mt-1">
                    {(sendEmailVerificationMutation.error as any)?.response?.data?.message || '发送失败'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 邮箱更换流程 */}
          {(() => {
            const step = profile?.pendingEmail ? getEmailChangeStep() : emailChangeStep;

            if (step === 'idle') {
              return (
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground mb-2 block">更换邮箱</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入新邮箱地址"
                      type="email"
                      value={emailChangeForm.newEmail}
                      onChange={(e) => setEmailChangeForm({ ...emailChangeForm, newEmail: e.target.value })}
                      className="max-w-xs"
                    />
                    <Button
                      onClick={() => requestEmailChangeMutation.mutate(emailChangeForm.newEmail)}
                      disabled={!emailChangeForm.newEmail || requestEmailChangeMutation.isPending}
                    >
                      {requestEmailChangeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      请求更换
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    更换邮箱需要先验证当前邮箱，然后再验证新邮箱
                  </p>
                  {requestEmailChangeMutation.isError && (
                    <p className="text-sm text-red-500 mt-2">
                      {(requestEmailChangeMutation.error as any)?.response?.data?.message || '请求失败'}
                    </p>
                  )}
                </div>
              );
            }

            if (step === 'verifying_old') {
              return (
                <div className="pt-4 border-t">
                  <div className="p-4 bg-yellow-50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <p className="font-medium text-yellow-700">步骤 1/2: 验证当前邮箱</p>
                    </div>
                    <p className="text-sm text-yellow-600">
                      验证码已发送到您的当前邮箱 <span className="font-medium">{profile?.email}</span>
                    </p>
                    <p className="text-sm text-yellow-600">
                      新邮箱：<span className="font-medium">{profile?.pendingEmail}</span>
                    </p>
                    <div className="flex gap-2 items-end">
                      <div className="space-y-1">
                        <Label>验证码</Label>
                        <Input
                          placeholder="6位数字"
                          value={emailChangeForm.verificationCode}
                          onChange={(e) => setEmailChangeForm({ ...emailChangeForm, verificationCode: e.target.value })}
                          maxLength={6}
                          className="w-32"
                        />
                      </div>
                      <Button
                        onClick={() => verifyOldEmailMutation.mutate(emailChangeForm.verificationCode)}
                        disabled={emailChangeForm.verificationCode.length !== 6 || verifyOldEmailMutation.isPending}
                      >
                        {verifyOldEmailMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        验证
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => resendEmailChangeCodeMutation.mutate()}
                        disabled={resendEmailChangeCodeMutation.isPending}
                      >
                        {resendEmailChangeCodeMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        重发验证码
                      </Button>
                    </div>
                    {verifyOldEmailMutation.isError && (
                      <p className="text-sm text-red-500">
                        {(verifyOldEmailMutation.error as any)?.response?.data?.message || '验证失败'}
                      </p>
                    )}
                    {resendEmailChangeCodeMutation.isSuccess && (
                      <p className="text-sm text-green-600">验证码已重新发送</p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelPendingEmailMutation.mutate()}
                      disabled={cancelPendingEmailMutation.isPending}
                      className="text-yellow-700"
                    >
                      取消更换
                    </Button>
                  </div>
                </div>
              );
            }

            if (step === 'verifying_new') {
              return (
                <div className="pt-4 border-t">
                  <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      <p className="font-medium text-blue-700">步骤 2/2: 验证新邮箱</p>
                    </div>
                    <p className="text-sm text-blue-600">
                      当前邮箱验证成功！验证链接已发送到新邮箱：<span className="font-medium">{profile?.pendingEmail}</span>
                    </p>
                    <p className="text-sm text-blue-600">
                      请在新邮箱中点击验证链接完成邮箱更换
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resendNewEmailVerificationMutation.mutate()}
                        disabled={resendNewEmailVerificationMutation.isPending}
                      >
                        {resendNewEmailVerificationMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        重发验证邮件
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelPendingEmailMutation.mutate()}
                        disabled={cancelPendingEmailMutation.isPending}
                        className="text-blue-700"
                      >
                        取消更换
                      </Button>
                    </div>
                    {resendNewEmailVerificationMutation.isSuccess && (
                      <p className="text-sm text-green-600">验证邮件已重新发送</p>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })()}
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
            <div className="space-y-4">
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
                {/* 密码强度指示器 */}
                {passwordStrength && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">密码强度</span>
                      <span className={cn(
                        "font-medium",
                        passwordStrength.level === 'weak' && "text-red-500",
                        passwordStrength.level === 'fair' && "text-orange-500",
                        passwordStrength.level === 'good' && "text-yellow-600",
                        passwordStrength.level === 'strong' && "text-green-500",
                      )}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-300", passwordStrength.color)}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {passwordStrength.checks.map((check, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          {check.passed ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-gray-300" />
                          )}
                          <span className={check.passed ? "text-green-600" : "text-muted-foreground"}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-xs text-red-500">两次输入的密码不一致</p>
                )}
              </div>
            </div>
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending || (passwordStrength?.level === 'weak')}>
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              更新密码
            </Button>
            {changePasswordMutation.isSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>密码修改成功，正在跳转到登录页...</span>
              </div>
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
