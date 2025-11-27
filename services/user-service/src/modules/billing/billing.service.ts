import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import {
  Subscription,
  Invoice,
  PaymentMethod,
  SubscriptionStatus,
  BillingCycle,
  PaymentProvider,
} from './entities/subscription.entity';
import { PlanType, PLAN_LIMITS } from '../quota/quota.entity';
import { QuotaService } from '../quota/quota.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  AddPaymentMethodDto,
  PricingDto,
} from './dto/billing.dto';

// Pricing configuration
const PRICING: Record<PlanType, { monthly: number; yearly: number }> = {
  [PlanType.FREE]: { monthly: 0, yearly: 0 },
  [PlanType.STARTER]: { monthly: 19, yearly: 190 },
  [PlanType.PRO]: { monthly: 49, yearly: 490 },
  [PlanType.ENTERPRISE]: { monthly: 199, yearly: 1990 },
};

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly quotaService: QuotaService,
    private readonly configService: ConfigService,
  ) {}

  // ========== Pricing ==========

  getPricing(): PricingDto[] {
    return [
      {
        plan: PlanType.FREE,
        name: 'Free',
        description: 'Perfect for individuals getting started',
        monthlyPrice: PRICING[PlanType.FREE].monthly,
        yearlyPrice: PRICING[PlanType.FREE].yearly,
        currency: 'USD',
        features: ['25 links', '1,000 clicks/month', '5 QR codes', 'Basic analytics'],
        limits: {
          maxLinks: PLAN_LIMITS[PlanType.FREE].maxLinks,
          maxClicks: PLAN_LIMITS[PlanType.FREE].maxClicks,
          maxQrCodes: PLAN_LIMITS[PlanType.FREE].maxQrCodes,
          maxTeamMembers: PLAN_LIMITS[PlanType.FREE].maxTeamMembers,
          maxCustomDomains: PLAN_LIMITS[PlanType.FREE].maxCustomDomains,
        },
      },
      {
        plan: PlanType.STARTER,
        name: 'Starter',
        description: 'Great for small teams and projects',
        monthlyPrice: PRICING[PlanType.STARTER].monthly,
        yearlyPrice: PRICING[PlanType.STARTER].yearly,
        currency: 'USD',
        features: [
          '500 links',
          '50,000 clicks/month',
          '50 QR codes',
          '3 team members',
          '1 custom domain',
          'API access',
          'Password protection',
        ],
        limits: {
          maxLinks: PLAN_LIMITS[PlanType.STARTER].maxLinks,
          maxClicks: PLAN_LIMITS[PlanType.STARTER].maxClicks,
          maxQrCodes: PLAN_LIMITS[PlanType.STARTER].maxQrCodes,
          maxTeamMembers: PLAN_LIMITS[PlanType.STARTER].maxTeamMembers,
          maxCustomDomains: PLAN_LIMITS[PlanType.STARTER].maxCustomDomains,
        },
      },
      {
        plan: PlanType.PRO,
        name: 'Pro',
        description: 'For growing businesses',
        monthlyPrice: PRICING[PlanType.PRO].monthly,
        yearlyPrice: PRICING[PlanType.PRO].yearly,
        currency: 'USD',
        features: [
          '5,000 links',
          '500,000 clicks/month',
          '500 QR codes',
          '10 team members',
          '5 custom domains',
          'Advanced analytics',
          'A/B testing',
          'Geo targeting',
          'Device targeting',
        ],
        limits: {
          maxLinks: PLAN_LIMITS[PlanType.PRO].maxLinks,
          maxClicks: PLAN_LIMITS[PlanType.PRO].maxClicks,
          maxQrCodes: PLAN_LIMITS[PlanType.PRO].maxQrCodes,
          maxTeamMembers: PLAN_LIMITS[PlanType.PRO].maxTeamMembers,
          maxCustomDomains: PLAN_LIMITS[PlanType.PRO].maxCustomDomains,
        },
      },
      {
        plan: PlanType.ENTERPRISE,
        name: 'Enterprise',
        description: 'For large organizations with custom needs',
        monthlyPrice: PRICING[PlanType.ENTERPRISE].monthly,
        yearlyPrice: PRICING[PlanType.ENTERPRISE].yearly,
        currency: 'USD',
        features: [
          'Unlimited links',
          'Unlimited clicks',
          'Unlimited QR codes',
          'Unlimited team members',
          'Unlimited custom domains',
          'SSO/SAML',
          'Dedicated support',
          'SLA guarantee',
          'Custom integrations',
        ],
        limits: {
          maxLinks: -1,
          maxClicks: -1,
          maxQrCodes: -1,
          maxTeamMembers: -1,
          maxCustomDomains: -1,
        },
      },
    ];
  }

  // ========== Subscriptions ==========

  async getSubscription(teamId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async createSubscription(teamId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
    // Check for existing active subscription
    const existing = await this.subscriptionRepository.findOne({
      where: { teamId, status: SubscriptionStatus.ACTIVE },
    });

    if (existing) {
      throw new ConflictException('Team already has an active subscription');
    }

    const pricing = PRICING[dto.plan];
    const amount = dto.billingCycle === BillingCycle.YEARLY ? pricing.yearly : pricing.monthly;

    const now = new Date();
    const periodEnd = new Date(now);
    if (dto.billingCycle === BillingCycle.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const subscription = this.subscriptionRepository.create({
      teamId,
      plan: dto.plan,
      status: dto.plan === PlanType.FREE ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIALING,
      billingCycle: dto.billingCycle,
      paymentProvider: dto.paymentProvider,
      amount,
      currency: 'USD',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: dto.plan !== PlanType.FREE ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) : undefined,
    });

    await this.subscriptionRepository.save(subscription);

    // Update quota plan
    await this.quotaService.updatePlan(teamId, dto.plan);

    return subscription;
  }

  async updateSubscription(teamId: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { teamId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (dto.plan) {
      const pricing = PRICING[dto.plan];
      const cycle = dto.billingCycle || subscription.billingCycle;
      subscription.plan = dto.plan;
      subscription.amount = cycle === BillingCycle.YEARLY ? pricing.yearly : pricing.monthly;

      // Update quota plan
      await this.quotaService.updatePlan(teamId, dto.plan);
    }

    if (dto.billingCycle) {
      subscription.billingCycle = dto.billingCycle;
      const pricing = PRICING[subscription.plan];
      subscription.amount = dto.billingCycle === BillingCycle.YEARLY ? pricing.yearly : pricing.monthly;
    }

    return this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(teamId: string, dto: CancelSubscriptionDto): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { teamId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (dto.cancelAtPeriodEnd) {
      subscription.cancelAtPeriodEnd = true;
    } else {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();

      // Downgrade to free plan
      await this.quotaService.updatePlan(teamId, PlanType.FREE);
    }

    return this.subscriptionRepository.save(subscription);
  }

  async reactivateSubscription(teamId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    if (subscription.status === SubscriptionStatus.ACTIVE && !subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is already active');
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.status = SubscriptionStatus.ACTIVE;

    return this.subscriptionRepository.save(subscription);
  }

  // ========== Invoices ==========

  async getInvoices(teamId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async createInvoice(
    teamId: string,
    subscriptionId: string,
    amount: number,
    lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>,
  ): Promise<Invoice> {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = this.invoiceRepository.create({
      teamId,
      subscriptionId,
      invoiceNumber,
      subtotal: amount,
      tax: 0,
      total: amount,
      currency: 'USD',
      status: 'pending',
      dueDate,
      lineItems,
    });

    return this.invoiceRepository.save(invoice);
  }

  // ========== Payment Methods ==========

  async getPaymentMethods(teamId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find({
      where: { teamId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async addPaymentMethod(teamId: string, dto: AddPaymentMethodDto): Promise<PaymentMethod> {
    // In production, this would validate the token with the payment provider
    // and create a payment method in their system

    const paymentMethod = this.paymentMethodRepository.create({
      teamId,
      provider: dto.provider,
      type: 'card',
      last4: '4242', // Would come from provider
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: dto.setAsDefault || false,
    });

    if (dto.setAsDefault) {
      await this.paymentMethodRepository.update(
        { teamId },
        { isDefault: false },
      );
    }

    return this.paymentMethodRepository.save(paymentMethod);
  }

  async removePaymentMethod(teamId: string, paymentMethodId: string): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId, teamId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.paymentMethodRepository.remove(paymentMethod);
  }

  async setDefaultPaymentMethod(teamId: string, paymentMethodId: string): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId, teamId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.paymentMethodRepository.update(
      { teamId },
      { isDefault: false },
    );

    paymentMethod.isDefault = true;
    return this.paymentMethodRepository.save(paymentMethod);
  }

  // ========== Billing Portal ==========

  async getBillingOverview(teamId: string) {
    const subscription = await this.getSubscription(teamId);
    const paymentMethods = await this.getPaymentMethods(teamId);
    const invoices = await this.getInvoices(teamId);
    const usage = await this.quotaService.getUsage(teamId);

    return {
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount,
        currency: subscription.currency,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        brand: pm.brand,
        last4: pm.last4,
        expiryMonth: pm.expiryMonth,
        expiryYear: pm.expiryYear,
        isDefault: pm.isDefault,
      })),
      recentInvoices: invoices.slice(0, 5).map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        total: inv.total,
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
      })),
      usage,
    };
  }
}
