import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link2, CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/api';

type VerifyState = 'loading' | 'success' | 'error' | 'no-token';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const token = searchParams.get('token');

  const [state, setState] = useState<VerifyState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('no-token');
      return;
    }

    const verifyEmail = async () => {
      try {
        await authService.verifyEmail(token);
        setState('success');
        toast({
          title: '邮箱验证成功',
          description: '您的邮箱已成功验证',
        });
      } catch (error: any) {
        setState('error');
        const message = error.response?.data?.message || '验证链接无效或已过期';
        setErrorMessage(message);
        toast({
          title: '验证失败',
          description: message,
          variant: 'destructive',
        });
      }
    };

    verifyEmail();
  }, [token, toast]);

  // 加载中
  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">正在验证邮箱...</h2>
          <p className="text-gray-600">
            请稍候，我们正在验证您的邮箱地址
          </p>
        </div>
      </div>
    );
  }

  // 无 token
  if (state === 'no-token') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <Mail className="h-10 w-10 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">缺少验证令牌</h2>
          <p className="text-gray-600">
            请点击邮件中的验证链接，或登录后重新发送验证邮件。
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/login')} className="w-full">
              前往登录
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 验证失败
  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">验证失败</h2>
          <p className="text-gray-600">
            {errorMessage || '验证链接可能已过期或无效。请登录后重新发送验证邮件。'}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/login')} className="w-full">
              前往登录
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 验证成功
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">邮箱验证成功</h2>
        <p className="text-gray-600">
          您的邮箱已成功验证，现在可以使用完整功能了。
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            前往控制台
          </Button>
          <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
            前往登录
          </Button>
        </div>
      </div>
    </div>
  );
}
