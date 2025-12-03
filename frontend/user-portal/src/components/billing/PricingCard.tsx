import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PricingPlan } from '@/hooks/useBilling';

interface PricingCardProps {
  plan: PricingPlan;
  interval: 'month' | 'year';
  currentPlanId?: string;
  isLoading?: boolean;
  onSelect: (planCode: string) => void;
}

export function PricingCard({
  plan,
  interval,
  currentPlanId,
  isLoading,
  onSelect,
}: PricingCardProps) {
  const price = interval === 'month' ? plan.priceMonthly : plan.priceYearly;
  const isCurrentPlan = currentPlanId === plan.id;
  const isFreePlan = plan.priceMonthly === 0;
  const yearlyDiscount = Math.round(
    ((plan.priceMonthly * 12 - plan.priceYearly) / (plan.priceMonthly * 12)) * 100
  );

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-white dark:bg-gray-800 p-8 shadow-sm transition-shadow hover:shadow-md',
        plan.popular && 'border-primary ring-2 ring-primary',
        isCurrentPlan && 'border-green-500 bg-green-50/50 dark:bg-green-900/20'
      )}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
          最受欢迎
        </span>
      )}
      {isCurrentPlan && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-4 py-1 text-xs font-semibold text-white">
          当前套餐
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            ${price.toLocaleString()}
          </span>
          <span className="ml-2 text-gray-500 dark:text-gray-400">
            /{interval === 'month' ? '月' : '年'}
          </span>
        </div>
        {interval === 'year' && yearlyDiscount > 0 && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            节省 {yearlyDiscount}% (相比月付)
          </p>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex justify-between">
          <span>链接数量</span>
          <span className="font-medium">
            {plan.limits.links === -1 ? '无限' : plan.limits.links.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>月点击量</span>
          <span className="font-medium">
            {plan.limits.clicks === -1 ? '无限' : plan.limits.clicks.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>自定义域名</span>
          <span className="font-medium">
            {plan.limits.customDomains === -1 ? '无限' : plan.limits.customDomains}
          </span>
        </div>
        <div className="flex justify-between">
          <span>团队成员</span>
          <span className="font-medium">
            {plan.limits.teamMembers === -1 ? '无限' : plan.limits.teamMembers}
          </span>
        </div>
      </div>

      <Button
        className="mt-6 w-full"
        variant={plan.popular ? 'default' : 'outline'}
        disabled={isCurrentPlan || isLoading || isFreePlan}
        onClick={() => onSelect(plan.code || plan.id)}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            处理中...
          </>
        ) : isCurrentPlan ? (
          '当前套餐'
        ) : isFreePlan ? (
          '免费使用'
        ) : (
          '选择套餐'
        )}
      </Button>
    </div>
  );
}
