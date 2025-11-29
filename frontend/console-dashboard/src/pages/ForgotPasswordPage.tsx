import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertCircle, CheckCircle, ArrowLeft, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminAuthService } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await adminAuthService.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || '发送重置邮件失败，请稍后重试');
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
          <h1 className="text-2xl font-bold text-gray-900">忘记密码</h1>
          <p className="mt-2 text-sm text-gray-600">
            {success ? '请检查您的邮箱' : '输入您的邮箱以重置密码'}
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-lg bg-green-50 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">重置邮件已发送</p>
                <p className="mt-1 text-sm text-green-600">
                  我们已向 <span className="font-medium">{email}</span> 发送了密码重置链接。
                  请查收邮件并按照说明操作。
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500">
              没有收到邮件？请检查垃圾邮件文件夹，或者
              <button
                onClick={() => setSuccess(false)}
                className="ml-1 text-primary hover:underline"
              >
                重新发送
              </button>
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回登录
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? '发送中...' : '发送重置邮件'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-gray-600 hover:text-primary"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回登录
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
