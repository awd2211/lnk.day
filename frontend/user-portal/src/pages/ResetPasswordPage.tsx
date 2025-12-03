import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link2, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/api';
import { PasswordStrengthIndicator, calculatePasswordStrength } from '@/components/settings/PasswordStrengthIndicator';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const token = searchParams.get('token');

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInvalidToken, setIsInvalidToken] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: '两次输入的密码不匹配',
        variant: 'destructive',
      });
      return;
    }

    // 使用密码强度检测验证
    const strengthResult = calculatePasswordStrength(passwords.newPassword);

    // 检查基本要求
    const basicRequirements = strengthResult.requirements.slice(0, 4);
    const unmetRequirements = basicRequirements.filter(r => !r.met);

    if (unmetRequirements.length > 0) {
      toast({
        title: '密码不符合要求',
        description: unmetRequirements.map(r => r.label).join('；'),
        variant: 'destructive'
      });
      return;
    }

    if (strengthResult.score < 30) {
      toast({
        title: '密码强度太弱',
        description: '请创建一个更复杂的密码',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword(token!, passwords.newPassword);
      setIsSuccess(true);
      toast({
        title: '密码已重置',
        description: '您的密码已成功重置，请使用新密码登录',
      });
    } catch (error: any) {
      const message = error.response?.data?.message || '重置密码失败，链接可能已过期';
      if (message.includes('expired') || message.includes('invalid') || message.includes('过期') || message.includes('无效')) {
        setIsInvalidToken(true);
      }
      toast({
        title: '重置失败',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 无效 token
  if (isInvalidToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">链接无效或已过期</h2>
          <p className="text-gray-600">
            密码重置链接可能已过期或无效。请重新申请密码重置。
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            返回登录
          </Button>
        </div>
      </div>
    );
  }

  // 重置成功
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">密码已重置</h2>
          <p className="text-gray-600">
            您的密码已成功重置，现在可以使用新密码登录了。
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            前往登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Link2 className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">设置新密码</h2>
          <p className="mt-2 text-sm text-gray-600">
            请输入您的新密码
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <Label htmlFor="newPassword">新密码</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              placeholder="••••••••"
              className="mt-1"
              required
              minLength={8}
              autoFocus
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
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              placeholder="••••••••"
              className="mt-1"
              required
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '重置中...' : '重置密码'}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-primary hover:underline"
          >
            返回登录
          </button>
        </div>
      </div>
    </div>
  );
}
