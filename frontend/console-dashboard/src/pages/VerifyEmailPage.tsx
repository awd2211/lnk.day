import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { profileService } from '@/lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setError('无效的验证链接');
      return;
    }

    const verifyEmail = async () => {
      try {
        await profileService.verifyEmail(token);
        setSuccess(true);
        setTimeout(() => {
          navigate('/profile');
        }, 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || '验证失败，链接可能已过期');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">正在验证邮箱</h1>
          <p className="mt-2 text-sm text-gray-600">
            请稍候...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">验证失败</h1>
          <p className="mt-2 text-sm text-gray-600">
            {error}
          </p>
          <Link to="/profile">
            <Button className="mt-6 w-full">返回个人中心</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">邮箱验证成功</h1>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 rounded-lg bg-green-50 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">邮箱已验证</p>
              <p className="mt-1 text-sm text-green-600">
                您的邮箱已成功验证，正在跳转到个人中心...
              </p>
            </div>
          </div>
          <Link to="/profile">
            <Button className="w-full">返回个人中心</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
