import { useState } from 'react';
import {
  CreditCard,
  FileText,
  Package,
  Settings,
  Calendar,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PricingCard } from '@/components/billing/PricingCard';
import { InvoiceList } from '@/components/billing/InvoiceList';
import { PaymentMethods } from '@/components/billing/PaymentMethods';
import { AddPaymentMethodDialog } from '@/components/billing/AddPaymentMethodDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSubscription,
  usePricing,
  useInvoices,
  usePaymentMethods,
  useCreateCheckoutSession,
  useCreatePortalSession,
  useCancelSubscription,
  useSetDefaultPaymentMethod,
  useDeletePaymentMethod,
  useDownloadInvoice,
} from '@/hooks/useBilling';

type Tab = 'plans' | 'invoices' | 'payment';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('plans');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: pricingData, isLoading: pricingLoading } = usePricing();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ limit: 10 });
  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = usePaymentMethods();

  // Mutations
  const createCheckout = useCreateCheckoutSession();
  const createPortal = useCreatePortalSession();
  const cancelSubscription = useCancelSubscription();
  const setDefaultPayment = useSetDefaultPaymentMethod();
  const deletePayment = useDeletePaymentMethod();
  const downloadInvoice = useDownloadInvoice();

  const tabs = [
    { id: 'plans' as Tab, label: '套餐计划', icon: Package },
    { id: 'invoices' as Tab, label: '发票历史', icon: FileText },
    { id: 'payment' as Tab, label: '支付方式', icon: CreditCard },
  ];

  const handleSelectPlan = async (priceId: string) => {
    setSelectedPriceId(priceId);
    try {
      await createCheckout.mutateAsync({
        priceId,
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`,
      });
    } catch (error: any) {
      toast({
        title: '创建支付失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSelectedPriceId(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await createPortal.mutateAsync({
        returnUrl: window.location.href,
      });
    } catch (error: any) {
      toast({
        title: '打开账单门户失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription.mutateAsync();
      setShowCancelConfirm(false);
      toast({ title: '订阅已取消', description: '您的服务将在当前周期结束后停止' });
    } catch (error: any) {
      toast({
        title: '取消订阅失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefaultPayment = async (id: string) => {
    try {
      await setDefaultPayment.mutateAsync(id);
      toast({ title: '默认支付方式已更新' });
    } catch (error: any) {
      toast({
        title: '设置失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePayment = async () => {
    if (!deletingPaymentId) return;

    try {
      await deletePayment.mutateAsync(deletingPaymentId);
      setDeletingPaymentId(null);
      toast({ title: '支付方式已删除' });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      await downloadInvoice.mutateAsync(invoiceId);
    } catch (error: any) {
      toast({
        title: '下载失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleAddPaymentMethod = () => {
    setShowAddPaymentMethod(true);
  };

  const handlePaymentMethodAdded = () => {
    // 刷新支付方式列表
    queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] });
    toast({
      title: '添加成功',
      description: '支付方式已成功添加',
    });
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    incomplete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  const statusLabels: Record<string, string> = {
    active: '活跃',
    trialing: '试用中',
    past_due: '逾期',
    canceled: '已取消',
    incomplete: '未完成',
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold dark:text-white">订阅与计费</h1>
        <p className="text-gray-500 dark:text-gray-400">管理您的订阅套餐和支付信息</p>
      </div>

      {/* Current Subscription Status */}
      {subscriptionLoading ? (
        <div className="mb-8 rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </div>
      ) : subscription ? (
        <div className="mb-8 rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold dark:text-white">{subscription.planName}</h2>
                <Badge className={statusColors[subscription.status]}>
                  {statusLabels[subscription.status]}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {subscription.interval === 'month' ? '月付' : '年付'}
                </span>
                <span>
                  当前周期: {new Date(subscription.currentPeriodStart).toLocaleDateString('zh-CN')}{' '}
                  - {new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-CN')}
                </span>
              </div>
              {subscription.cancelAtPeriodEnd && (
                <div className="mt-3 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    订阅将在{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-CN')} 取消
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleManageSubscription}>
                <Settings className="mr-2 h-4 w-4" />
                管理订阅
              </Button>
              {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  取消订阅
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-dashed bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-semibold dark:text-white">尚未订阅</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            选择一个套餐开始使用完整功能
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Quick Links */}
          <div className="mt-6 rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">快速链接</h3>
            <div className="mt-3 space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={handleManageSubscription}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Stripe 账单门户
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'plans' && (
            <div className="space-y-6">
              {/* Billing interval toggle */}
              <div className="flex items-center justify-center gap-4">
                <span
                  className={`text-sm ${
                    billingInterval === 'month'
                      ? 'font-medium text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  月付
                </span>
                <Switch
                  checked={billingInterval === 'year'}
                  onCheckedChange={(checked) => setBillingInterval(checked ? 'year' : 'month')}
                />
                <span
                  className={`text-sm ${
                    billingInterval === 'year'
                      ? 'font-medium text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  年付
                  <Badge variant="secondary" className="ml-2">
                    省 20%
                  </Badge>
                </span>
              </div>

              {/* Pricing cards */}
              {pricingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {pricingData?.plans?.map((plan) => (
                    <PricingCard
                      key={plan.id}
                      plan={plan}
                      interval={billingInterval}
                      currentPlanId={subscription?.planId}
                      isLoading={
                        createCheckout.isPending &&
                        selectedPriceId ===
                          (billingInterval === 'month'
                            ? plan.priceIdMonthly
                            : plan.priceIdYearly)
                      }
                      onSelect={handleSelectPlan}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-6 text-lg font-semibold dark:text-white">发票历史</h2>
              <InvoiceList
                invoices={invoicesData?.invoices || []}
                isLoading={invoicesLoading}
                hasMore={invoicesData?.hasMore}
                onDownload={handleDownloadInvoice}
                downloadingId={downloadInvoice.isPending ? undefined : undefined}
              />
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-6 text-lg font-semibold dark:text-white">支付方式</h2>
              <PaymentMethods
                paymentMethods={paymentMethodsData?.paymentMethods || []}
                isLoading={paymentMethodsLoading}
                onSetDefault={handleSetDefaultPayment}
                onDelete={(id) => setDeletingPaymentId(id)}
                onAddNew={handleAddPaymentMethod}
                settingDefaultId={setDefaultPayment.isPending ? undefined : undefined}
                deletingId={deletePayment.isPending ? undefined : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Cancel Subscription Confirm Dialog */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="取消订阅"
        description="确定要取消订阅吗？您的服务将在当前周期结束后停止。"
        confirmText="取消订阅"
        onConfirm={handleCancelSubscription}
        isLoading={cancelSubscription.isPending}
        variant="destructive"
      />

      {/* Delete Payment Method Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingPaymentId}
        onOpenChange={(open) => !open && setDeletingPaymentId(null)}
        title="删除支付方式"
        description="确定要删除此支付方式吗？"
        confirmText="删除"
        onConfirm={handleDeletePayment}
        isLoading={deletePayment.isPending}
        variant="destructive"
      />

      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={showAddPaymentMethod}
        onOpenChange={setShowAddPaymentMethod}
        onSuccess={handlePaymentMethodAdded}
      />
    </Layout>
  );
}
