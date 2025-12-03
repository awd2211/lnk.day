import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Link2, ArrowLeft, Mail, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, sendLoginCode, loginWithCode, register, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password');
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [codeFormData, setCodeFormData] = useState({
    email: '',
    code: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!codeFormData.email) {
      toast({
        title: '请输入邮箱',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingCode(true);
    try {
      await sendLoginCode(codeFormData.email);
      toast({
        title: '验证码已发送',
        description: '请查收邮件，验证码5分钟内有效',
      });
      setCountdown(60); // 60秒后可以重新发送
    } catch (error: any) {
      // 为了防止邮箱枚举攻击，即使失败也显示成功消息
      toast({
        title: '验证码已发送',
        description: '如果该邮箱已注册，您将收到验证码',
      });
      setCountdown(60);
    } finally {
      setIsSendingCode(false);
    }
  }, [codeFormData.email, sendLoginCode, toast]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password);
      }
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: isLoginMode ? '登录失败' : '注册失败',
        description: error.response?.data?.message || '请检查您的输入',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeFormData.email || !codeFormData.code) {
      toast({
        title: '请填写完整信息',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithCode(codeFormData.email, codeFormData.code);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: '登录失败',
        description: error.response?.data?.message || '验证码错误或已过期',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast({
        title: '请输入邮箱',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.forgotPassword(forgotPasswordEmail);
      toast({
        title: '邮件已发送',
        description: '如果该邮箱已注册，您将收到密码重置链接',
      });
      setIsForgotPasswordMode(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      // 即使失败也显示成功消息，防止邮箱枚举攻击
      toast({
        title: '邮件已发送',
        description: '如果该邮箱已注册，您将收到密码重置链接',
      });
      setIsForgotPasswordMode(false);
      setForgotPasswordEmail('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 忘记密码界面
  if (isForgotPasswordMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Link2 className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">重置密码</h2>
            <p className="mt-2 text-sm text-gray-600">
              输入您的邮箱，我们将发送密码重置链接
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="forgotEmail">邮箱</Label>
              <Input
                id="forgotEmail"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
                required
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '发送中...' : '发送重置链接'}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordMode(false);
                setForgotPasswordEmail('');
              }}
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 注册模式
  if (!isLoginMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Link2 className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">创建账户</h2>
            <p className="mt-2 text-sm text-gray-600">开始您的链接管理之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="您的姓名"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '处理中...' : '注册'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">或者</span>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(true);
                setFormData({ name: '', email: '', password: '' });
              }}
              className="text-sm text-primary hover:underline"
            >
              已有账户？立即登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 登录模式 - 支持密码登录和验证码登录
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Link2 className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">欢迎回来</h2>
          <p className="mt-2 text-sm text-gray-600">登录您的 lnk.day 账户</p>
        </div>

        <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'password' | 'code')} className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              密码登录
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              验证码登录
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="mt-6 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="mt-1"
                  required
                  minLength={6}
                />
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordMode(true)}
                  className="text-sm text-primary hover:underline"
                >
                  忘记密码？
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? '登录中...' : '登录'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="code" className="mt-6 space-y-5">
            <form onSubmit={handleCodeLogin} className="space-y-5">
              <div>
                <Label htmlFor="codeEmail">邮箱</Label>
                <Input
                  id="codeEmail"
                  type="email"
                  value={codeFormData.email}
                  onChange={(e) => setCodeFormData({ ...codeFormData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="loginCode">验证码</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="loginCode"
                    type="text"
                    value={codeFormData.code}
                    onChange={(e) => {
                      // 只允许输入数字，最多6位
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCodeFormData({ ...codeFormData, code: value });
                    }}
                    placeholder="6位数字验证码"
                    className="flex-1"
                    maxLength={6}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={isSendingCode || countdown > 0 || !codeFormData.email}
                    className="min-w-[100px]"
                  >
                    {countdown > 0 ? `${countdown}秒` : isSendingCode ? '发送中' : '获取验证码'}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  验证码将发送至您的邮箱，5分钟内有效
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || codeFormData.code.length !== 6}>
                {isSubmitting ? '登录中...' : '登录'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">或者</span>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(false);
              setFormData({ name: '', email: '', password: '' });
            }}
            className="text-sm text-primary hover:underline"
          >
            没有账户？立即注册
          </button>
        </div>
      </div>
    </div>
  );
}
