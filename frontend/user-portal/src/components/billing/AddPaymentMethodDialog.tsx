import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { billingService } from '@/lib/api';

// 懒加载 Stripe - 只在配置了公钥时初始化
const getStripePromise = () => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  return loadStripe(key);
};

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Stripe Card Element 样式
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#ef4444',
    },
  },
  hidePostalCode: false,
};

// 内部表单组件
function PaymentForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. 调用后端创建 SetupIntent
      const { data } = await billingService.createSetupIntent();
      const clientSecret = data.clientSecret;

      if (!clientSecret) {
        throw new Error('无法创建支付设置');
      }

      // 2. 确认 SetupIntent 并保存支付方式
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || '添加支付方式失败');
      }

      if (setupIntent?.status === 'succeeded') {
        onSuccess();
      } else {
        throw new Error('支付方式设置未完成');
      }
    } catch (err: any) {
      setError(err.message || '添加支付方式失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          银行卡信息
        </label>
        <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
          <CardElement options={cardElementOptions} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          我们使用 Stripe 安全处理您的支付信息
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          取消
        </Button>
        <Button type="submit" disabled={!stripe || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              添加中...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              添加支付方式
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// 主组件
export function AddPaymentMethodDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPaymentMethodDialogProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // 检查 Stripe 公钥是否配置
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            添加支付方式
          </DialogTitle>
          <DialogDescription>
            添加信用卡或借记卡用于订阅付款
          </DialogDescription>
        </DialogHeader>

        {!stripeKey ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              支付功能未配置。请联系管理员设置 Stripe 密钥。
            </AlertDescription>
          </Alert>
        ) : (
          <Elements stripe={getStripePromise()}>
            <PaymentForm onSuccess={handleSuccess} onCancel={handleCancel} />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
