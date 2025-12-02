import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Shield, AlertCircle, Mail, KeyRound, CheckCircle2, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { SHORT_LINK_DOMAIN } from '@/lib/config';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithCode, isAuthenticated, isLoading } = useAuth();
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password');

  // Message from redirect (e.g., password changed)
  const redirectMessage = (location.state as { message?: string })?.message;

  // Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Code login state
  const [codeEmail, setCodeEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // 2FA state
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('console_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setCodeEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password, rememberMe, requiresTwoFactor ? twoFactorCode : undefined);

      if (result.requiresTwoFactor) {
        // 需要 2FA 验证
        setRequiresTwoFactor(true);
        setIsSubmitting(false);
        return;
      }

      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('console_remembered_email', email);
        } else {
          localStorage.removeItem('console_remembered_email');
        }
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查邮箱和密码');
      // 如果 2FA 验证失败，清空验证码但保持 2FA 状态
      if (requiresTwoFactor) {
        setTwoFactorCode('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresTwoFactor(false);
    setTwoFactorCode('');
    setError('');
  };

  const handleSendCode = async () => {
    if (!codeEmail) {
      setError('请输入邮箱地址');
      return;
    }

    setError('');
    setIsSendingCode(true);

    try {
      await api.post('/admin/login/send-code', { email: codeEmail });
      setCodeSent(true);
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || '发送验证码失败');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await loginWithCode(codeEmail, code, rememberMe);
      if (rememberMe) {
        localStorage.setItem('console_remembered_email', codeEmail);
      } else {
        localStorage.removeItem('console_remembered_email');
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '验证码登录失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{SHORT_LINK_DOMAIN} Console</h1>
          <p className="mt-2 text-sm text-gray-600">管理后台登录</p>
        </div>

        {redirectMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {redirectMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Tabs value={loginMethod} onValueChange={(v) => { setLoginMethod(v as 'password' | 'code'); setError(''); }}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="password" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              密码登录
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              验证码登录
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            {requiresTwoFactor ? (
              // 2FA 验证码输入界面
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">双因素认证</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    请输入身份验证器应用中显示的 6 位验证码
                  </p>
                </div>
                <div>
                  <Label htmlFor="twoFactorCode">验证码</Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="mt-1 text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || twoFactorCode.length !== 6}>
                  {isSubmitting ? '验证中...' : '验证'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBackToLogin}
                >
                  返回登录
                </Button>
              </form>
            ) : (
              // 常规密码登录界面
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">管理员邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                      记住我
                    </Label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    忘记密码？
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? '登录中...' : '登录'}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="code">
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <Label htmlFor="codeEmail">管理员邮箱</Label>
                <Input
                  id="codeEmail"
                  type="email"
                  value={codeEmail}
                  onChange={(e) => setCodeEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">验证码</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6 位验证码"
                    maxLength={6}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={isSendingCode || countdown > 0}
                    className="shrink-0 w-28"
                  >
                    {countdown > 0 ? `${countdown}s` : (codeSent ? '重新发送' : '获取验证码')}
                  </Button>
                </div>
                {codeSent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    验证码已发送至您的邮箱，5 分钟内有效
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMeCode"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="rememberMeCode" className="text-sm font-normal cursor-pointer">
                  记住我
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || !code}>
                {isSubmitting ? '登录中...' : '登录'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-gray-500">
          仅限授权管理员访问
        </p>
      </div>
    </div>
  );
}
