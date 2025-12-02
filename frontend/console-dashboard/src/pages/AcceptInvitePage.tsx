import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { SHORT_LINK_DOMAIN } from '@/lib/config';

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [adminInfo, setAdminInfo] = useState<{ email: string; name: string } | null>(null);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setError('邀请链接无效');
        return;
      }

      try {
        const response = await api.post('/admin/invite/validate', { token });
        if (response.data.valid) {
          setIsValid(true);
          setAdminInfo(response.data.admin);
        } else {
          setError('邀请链接无效或已过期');
        }
      } catch {
        setError('邀请链接无效或已过期');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('密码至少需要 8 个字符');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/admin/invite/accept', { token, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || '激活失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-gray-600">验证邀请链接...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">账户激活成功</h1>
          <p className="mt-2 text-gray-600">正在跳转到登录页面...</p>
          <Link to="/login" className="mt-4 inline-block text-primary hover:underline">
            立即登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{SHORT_LINK_DOMAIN} Console</h1>
          <p className="mt-2 text-sm text-gray-600">
            {isValid ? '设置您的账户密码' : '接受邀请'}
          </p>
        </div>

        {error && !isValid && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-gray-600">{error}</p>
            <p className="mt-4 text-sm text-gray-500">
              请联系管理员重新发送邀请链接
            </p>
            <Link to="/login" className="mt-4 inline-block text-primary hover:underline">
              返回登录页面
            </Link>
          </div>
        )}

        {isValid && adminInfo && (
          <>
            <div className="mb-6 rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">欢迎</p>
              <p className="font-semibold text-gray-900">{adminInfo.name}</p>
              <p className="text-sm text-gray-500">{adminInfo.email}</p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">设置密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 8 个字符"
                  className="mt-1"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="mt-1"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? '激活中...' : '激活账户'}
              </Button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-xs text-gray-500">
          仅限授权管理员访问
        </p>
      </div>
    </div>
  );
}
