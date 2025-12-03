import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // 如果邮箱已验证或用户已关闭横幅，不显示
  if (!user || user.emailVerified || user.emailVerifiedAt || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authService.resendVerification();
      toast({
        title: '验证邮件已发送',
        description: '请检查您的邮箱并点击验证链接',
      });
    } catch (error: any) {
      const message = error.response?.data?.message || '发送失败，请稍后重试';
      toast({
        title: '发送失败',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Mail className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-amber-800">
              <span className="font-medium">请验证您的邮箱地址</span>
              {' '}— 我们已向 {user.email} 发送了验证链接。验证邮箱后可解锁全部功能。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
            className="bg-white hover:bg-amber-100 border-amber-300 text-amber-800"
          >
            {isResending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                发送中...
              </>
            ) : (
              '重新发送'
            )}
          </Button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
