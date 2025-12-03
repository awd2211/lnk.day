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
import { PlanService } from '../plan/plan.service';
import { Plan } from '../plan/plan.entity';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  AddPaymentMethodDto,
  PricingDto,
  PricingPlanDto,
  PricingResponseDto,
} from './dto/billing.dto';

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
    private readonly planService: PlanService,
    private readonly configService: ConfigService,
  ) {}

  // ========== Pricing ==========

  /**
   * 从数据库获取公开的套餐定价信息（新格式，供前端使用）
   */
  async getPricing(): Promise<PricingResponseDto> {
    const plans = await this.planService.findPublic();
    return {
      plans: plans.map((plan) => this.convertPlanToPricingPlanDto(plan)),
    };
  }

  /**
   * 将 Plan 实体转换为 PricingPlanDto（匹配前端期望的格式）
   */
  private convertPlanToPricingPlanDto(plan: Plan): PricingPlanDto {
    // 生成功能列表
    const features: string[] = [];

    // 添加限制相关的功能描述
    const limits = plan.limits;
    if (limits.maxLinks === -1) {
      features.push('无限链接');
    } else {
      features.push(`${limits.maxLinks.toLocaleString()} 个链接`);
    }

    if (limits.maxClicks === -1) {
      features.push('无限点击');
    } else {
      features.push(`${limits.maxClicks.toLocaleString()} 次点击/月`);
    }

    if (limits.maxQrCodes === -1) {
      features.push('无限 QR 码');
    } else {
      features.push(`${limits.maxQrCodes.toLocaleString()} 个 QR 码`);
    }

    if (limits.maxTeamMembers === -1) {
      features.push('无限团队成员');
    } else if (limits.maxTeamMembers > 1) {
      features.push(`${limits.maxTeamMembers} 个团队成员`);
    }

    if (limits.maxCustomDomains === -1) {
      features.push('无限自定义域名');
    } else if (limits.maxCustomDomains > 0) {
      features.push(`${limits.maxCustomDomains} 个自定义域名`);
    }

    // 添加功能特性
    const planFeatures = plan.features;
    if (planFeatures.apiAccess) features.push('API 访问');
    if (planFeatures.advancedAnalytics) features.push('高级分析');
    if (planFeatures.abtesting) features.push('A/B 测试');
    if (planFeatures.geoTargeting) features.push('地理定向');
    if (planFeatures.deviceTargeting) features.push('设备定向');
    if (planFeatures.passwordProtection) features.push('密码保护');
    if (planFeatures.webhooks) features.push('Webhooks');
    if (planFeatures.sso) features.push('SSO/SAML');
    if (planFeatures.whiteLabel) features.push('白标');
    if (planFeatures.dedicatedSupport) features.push('专属支持');
    if (planFeatures.customIntegrations) features.push('自定义集成');
    if (planFeatures.auditLogs) features.push('审计日志');

    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      priceMonthly: plan.pricing.monthly,
      priceYearly: plan.pricing.yearly,
      priceIdMonthly: plan.stripePriceIdMonthly || undefined,
      priceIdYearly: plan.stripePriceIdYearly || undefined,
      features,
      limits: {
        links: limits.maxLinks,
        clicks: limits.maxClicks,
        customDomains: limits.maxCustomDomains,
        teamMembers: limits.maxTeamMembers,
        apiRequests: limits.maxApiRequests,
      },
      popular: plan.badgeText === '热门' || plan.badgeText === 'Most Popular',
    };
  }

  /**
   * 将 Plan 实体转换为 PricingDto（旧格式，保留向后兼容）
   */
  private convertPlanToPricingDto(plan: Plan): PricingDto {
    // 生成功能列表
    const features: string[] = [];

    // 添加限制相关的功能描述
    const limits = plan.limits;
    if (limits.maxLinks === -1) {
      features.push('无限链接');
    } else {
      features.push(`${limits.maxLinks.toLocaleString()} 个链接`);
    }

    if (limits.maxClicks === -1) {
      features.push('无限点击');
    } else {
      features.push(`${limits.maxClicks.toLocaleString()} 次点击/月`);
    }

    if (limits.maxQrCodes === -1) {
      features.push('无限 QR 码');
    } else {
      features.push(`${limits.maxQrCodes.toLocaleString()} 个 QR 码`);
    }

    if (limits.maxTeamMembers === -1) {
      features.push('无限团队成员');
    } else if (limits.maxTeamMembers > 1) {
      features.push(`${limits.maxTeamMembers} 个团队成员`);
    }

    if (limits.maxCustomDomains === -1) {
      features.push('无限自定义域名');
    } else if (limits.maxCustomDomains > 0) {
      features.push(`${limits.maxCustomDomains} 个自定义域名`);
    }

    // 添加功能特性
    const planFeatures = plan.features;
    if (planFeatures.apiAccess) features.push('API 访问');
    if (planFeatures.advancedAnalytics) features.push('高级分析');
    if (planFeatures.abtesting) features.push('A/B 测试');
    if (planFeatures.geoTargeting) features.push('地理定向');
    if (planFeatures.deviceTargeting) features.push('设备定向');
    if (planFeatures.passwordProtection) features.push('密码保护');
    if (planFeatures.webhooks) features.push('Webhooks');
    if (planFeatures.sso) features.push('SSO/SAML');
    if (planFeatures.whiteLabel) features.push('白标');
    if (planFeatures.dedicatedSupport) features.push('专属支持');
    if (planFeatures.customIntegrations) features.push('自定义集成');
    if (planFeatures.auditLogs) features.push('审计日志');

    return {
      plan: plan.code as PlanType,
      name: plan.name,
      description: plan.description || '',
      monthlyPrice: plan.pricing.monthly,
      yearlyPrice: plan.pricing.yearly,
      currency: plan.pricing.currency || 'USD',
      features,
      limits: {
        maxLinks: limits.maxLinks,
        maxClicks: limits.maxClicks,
        maxQrCodes: limits.maxQrCodes,
        maxTeamMembers: limits.maxTeamMembers,
        maxCustomDomains: limits.maxCustomDomains,
      },
    };
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

    // 从数据库获取套餐定价
    const plan = await this.planService.findByCode(dto.plan);
    const amount = dto.billingCycle === BillingCycle.YEARLY ? plan.pricing.yearly : plan.pricing.monthly;

    const now = new Date();
    const periodEnd = new Date(now);
    if (dto.billingCycle === BillingCycle.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 使用数据库中配置的试用天数
    const trialDays = plan.trialDays || 0;
    const isFreePlan = plan.pricing.monthly === 0;

    const subscription = this.subscriptionRepository.create({
      teamId,
      plan: dto.plan,
      status: isFreePlan ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIALING,
      billingCycle: dto.billingCycle,
      paymentProvider: dto.paymentProvider,
      amount,
      currency: plan.pricing.currency || 'USD',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: !isFreePlan && trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : undefined,
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
      // 从数据库获取套餐定价
      const plan = await this.planService.findByCode(dto.plan);
      const cycle = dto.billingCycle || subscription.billingCycle;
      subscription.plan = dto.plan;
      subscription.amount = cycle === BillingCycle.YEARLY ? plan.pricing.yearly : plan.pricing.monthly;
      subscription.currency = plan.pricing.currency || 'USD';

      // Update quota plan
      await this.quotaService.updatePlan(teamId, dto.plan);
    }

    if (dto.billingCycle) {
      subscription.billingCycle = dto.billingCycle;
      // 从数据库获取当前套餐的定价
      const plan = await this.planService.findByCode(subscription.plan);
      subscription.amount = dto.billingCycle === BillingCycle.YEARLY ? plan.pricing.yearly : plan.pricing.monthly;
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
