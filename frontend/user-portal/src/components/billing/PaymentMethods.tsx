import { CreditCard, Star, Trash2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PaymentMethod } from '@/hooks/useBilling';

interface PaymentMethodsProps {
  paymentMethods: PaymentMethod[];
  isLoading?: boolean;
  onSetDefault?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddNew?: () => void;
  settingDefaultId?: string;
  deletingId?: string;
}

const cardBrandLogos: Record<string, string> = {
  visa: '💳 Visa',
  mastercard: '💳 Mastercard',
  amex: '💳 American Express',
  discover: '💳 Discover',
  unionpay: '💳 银联',
  jcb: '💳 JCB',
};

export function PaymentMethods({
  paymentMethods,
  isLoading,
  onSetDefault,
  onDelete,
  onAddNew,
  settingDefaultId,
  deletingId,
}: PaymentMethodsProps) {
  if (isLoading && paymentMethods.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paymentMethods.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
          <CreditCard className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            暂无支付方式
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            添加支付方式以便订阅和续费
          </p>
          {onAddNew && (
            <Button className="mt-4" onClick={onAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              添加支付方式
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                    <CreditCard className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    {method.type === 'card' && method.card && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {cardBrandLogos[method.card.brand.toLowerCase()] || method.card.brand}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            •••• {method.card.last4}
                          </span>
                          {method.isDefault && (
                            <Badge variant="secondary" className="ml-2">
                              <Star className="mr-1 h-3 w-3" />
                              默认
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          有效期至 {method.card.expMonth.toString().padStart(2, '0')}/
                          {method.card.expYear}
                        </p>
                      </>
                    )}
                    {method.type === 'alipay' && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          支付宝
                        </span>
                        {method.isDefault && (
                          <Badge variant="secondary" className="ml-2">
                            <Star className="mr-1 h-3 w-3" />
                            默认
                          </Badge>
                        )}
                      </div>
                    )}
                    {method.type === 'wechat_pay' && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          微信支付
                        </span>
                        {method.isDefault && (
                          <Badge variant="secondary" className="ml-2">
                            <Star className="mr-1 h-3 w-3" />
                            默认
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!method.isDefault && onSetDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetDefault(method.id)}
                      disabled={settingDefaultId === method.id}
                    >
                      {settingDefaultId === method.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        '设为默认'
                      )}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(method.id)}
                      disabled={deletingId === method.id || method.isDefault}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                    >
                      {deletingId === method.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {onAddNew && (
            <Button variant="outline" onClick={onAddNew} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              添加支付方式
            </Button>
          )}
        </>
      )}
    </div>
  );
}
