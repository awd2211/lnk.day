import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService } from '@/lib/api';

// Types
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  priceIdMonthly: string;
  priceIdYearly: string;
  features: string[];
  limits: {
    links: number;
    clicks: number;
    customDomains: number;
    teamMembers: number;
    apiRequests: number;
  };
  popular?: boolean;
}

export interface Subscription {
  id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  planId: string;
  planName: string;
  priceId: string;
  interval: 'month' | 'year';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;
  amountPaid: number;
  currency: string;
  invoiceUrl: string;
  invoicePdf: string;
  createdAt: string;
  dueDate?: string;
  lines: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'alipay' | 'wechat_pay';
  isDefault: boolean;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  createdAt: string;
}

// Hooks
export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const { data } = await billingService.getSubscription();
      return data as Subscription | null;
    },
  });
}

export function usePricing() {
  return useQuery({
    queryKey: ['billing', 'pricing'],
    queryFn: async () => {
      const { data } = await billingService.getPricing();
      return data as { plans: PricingPlan[] };
    },
  });
}

export function useInvoices(params?: { limit?: number; starting_after?: string }) {
  return useQuery({
    queryKey: ['billing', 'invoices', params],
    queryFn: async () => {
      const { data } = await billingService.getInvoices(params);
      return data as { invoices: Invoice[]; hasMore: boolean };
    },
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['billing', 'payment-methods'],
    queryFn: async () => {
      const { data } = await billingService.getPaymentMethods();
      return data as { paymentMethods: PaymentMethod[] };
    },
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (data: { priceId: string; successUrl: string; cancelUrl: string }) =>
      billingService.createCheckoutSession(data),
    onSuccess: (response) => {
      // Redirect to Stripe Checkout
      const { url } = response.data as { url: string };
      if (url) {
        window.location.href = url;
      }
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: (data: { returnUrl: string }) => billingService.createPortalSession(data),
    onSuccess: (response) => {
      // Redirect to Stripe Portal
      const { url } = response.data as { url: string };
      if (url) {
        window.location.href = url;
      }
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { priceId: string }) => billingService.updateSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => billingService.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId: string) =>
      billingService.setDefaultPaymentMethod(paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId: string) => billingService.deletePaymentMethod(paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] });
    },
  });
}

export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await billingService.downloadInvoice(invoiceId);
      return response.data as Blob;
    },
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'invoice.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
