import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

import {
  Subscription,
  Invoice,
  PaymentMethod,
  SubscriptionStatus,
  BillingCycle,
  PaymentProvider,
} from '../entities/subscription.entity';
import { PlanType } from '../../quota/quota.entity';
import { QuotaService } from '../../quota/quota.service';

// Price IDs from Stripe Dashboard (should be configured in env)
interface StripePriceConfig {
  monthly: string;
  yearly: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly frontendUrl: string;

  // Stripe Price IDs for each plan
  private readonly priceIds: Record<PlanType, StripePriceConfig>;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly quotaService: QuotaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-11-20.acacia',
      });
    }

    this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', '');
    this.frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:60010');

    // Configure price IDs from environment
    this.priceIds = {
      [PlanType.FREE]: { monthly: '', yearly: '' },
      [PlanType.STARTER]: {
        monthly: this.configService.get('STRIPE_PRICE_STARTER_MONTHLY', 'price_starter_monthly'),
        yearly: this.configService.get('STRIPE_PRICE_STARTER_YEARLY', 'price_starter_yearly'),
      },
      [PlanType.PRO]: {
        monthly: this.configService.get('STRIPE_PRICE_PRO_MONTHLY', 'price_pro_monthly'),
        yearly: this.configService.get('STRIPE_PRICE_PRO_YEARLY', 'price_pro_yearly'),
      },
      [PlanType.ENTERPRISE]: {
        monthly: this.configService.get('STRIPE_PRICE_ENTERPRISE_MONTHLY', 'price_enterprise_monthly'),
        yearly: this.configService.get('STRIPE_PRICE_ENTERPRISE_YEARLY', 'price_enterprise_yearly'),
      },
    };
  }

  // ========== Customer Management ==========

  async createOrGetCustomer(teamId: string, email: string, name?: string): Promise<string> {
    // Check if customer already exists
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { teamId },
    });

    if (existingSubscription?.externalCustomerId) {
      return existingSubscription.externalCustomerId;
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        teamId,
      },
    });

    this.logger.log(`Created Stripe customer ${customer.id} for team ${teamId}`);
    return customer.id;
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer.deleted ? null : customer as Stripe.Customer;
    } catch {
      return null;
    }
  }

  // ========== Checkout ==========

  async createCheckoutSession(
    teamId: string,
    email: string,
    plan: PlanType,
    billingCycle: BillingCycle,
  ): Promise<{ sessionId: string; url: string }> {
    if (plan === PlanType.FREE) {
      throw new BadRequestException('Cannot create checkout for free plan');
    }

    const customerId = await this.createOrGetCustomer(teamId, email);
    const priceId = billingCycle === BillingCycle.YEARLY
      ? this.priceIds[plan].yearly
      : this.priceIds[plan].monthly;

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${this.frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/billing/cancel`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          teamId,
          plan,
          billingCycle,
        },
      },
      metadata: {
        teamId,
        plan,
        billingCycle,
      },
      allow_promotion_codes: true,
    });

    this.logger.log(`Created checkout session ${session.id} for team ${teamId}`);

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });
  }

  // ========== Billing Portal ==========

  async createBillingPortalSession(teamId: string): Promise<{ url: string }> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { teamId, paymentProvider: PaymentProvider.STRIPE },
    });

    if (!subscription?.externalCustomerId) {
      throw new NotFoundException('No Stripe customer found for this team');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.externalCustomerId,
      return_url: `${this.frontendUrl}/billing`,
    });

    return { url: session.url };
  }

  // ========== Subscription Management ==========

  async getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      return null;
    }
  }

  async cancelStripeSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Stripe.Subscription> {
    if (cancelAtPeriodEnd) {
      return this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async reactivateStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async changeSubscriptionPlan(
    subscriptionId: string,
    newPlan: PlanType,
    billingCycle: BillingCycle,
  ): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const priceId = billingCycle === BillingCycle.YEARLY
      ? this.priceIds[newPlan].yearly
      : this.priceIds[newPlan].monthly;

    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  // ========== Payment Methods ==========

  async createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return { clientSecret: setupIntent.client_secret! };
  }

  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  }

  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<void> {
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  // ========== Invoices ==========

  async listStripeInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  }

  async getStripeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.stripe.invoices.retrieve(invoiceId);
  }

  async downloadInvoicePdf(invoiceId: string): Promise<string> {
    const invoice = await this.stripe.invoices.retrieve(invoiceId);
    return invoice.invoice_pdf || '';
  }

  // ========== Coupons & Promotions ==========

  async applyCoupon(subscriptionId: string, couponCode: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      coupon: couponCode,
    });
  }

  async createCoupon(
    percentOff: number,
    duration: 'once' | 'repeating' | 'forever',
    durationInMonths?: number,
  ): Promise<Stripe.Coupon> {
    return this.stripe.coupons.create({
      percent_off: percentOff,
      duration,
      duration_in_months: duration === 'repeating' ? durationInMonths : undefined,
    });
  }

  // ========== Webhook Handling ==========

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  // ========== Webhook Event Handlers ==========

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const teamId = session.metadata?.teamId;
    const plan = session.metadata?.plan as PlanType;
    const billingCycle = session.metadata?.billingCycle as BillingCycle;

    if (!teamId || !plan) {
      this.logger.error('Missing metadata in checkout session');
      return;
    }

    this.logger.log(`Checkout completed for team ${teamId}, plan: ${plan}`);

    // Subscription will be created via customer.subscription.created event
  }

  private async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const teamId = stripeSubscription.metadata?.teamId;
    const plan = stripeSubscription.metadata?.plan as PlanType;
    const billingCycle = stripeSubscription.metadata?.billingCycle as BillingCycle;

    if (!teamId) {
      this.logger.error('Missing teamId in subscription metadata');
      return;
    }

    // Create local subscription record
    const subscription = this.subscriptionRepository.create({
      teamId,
      plan: plan || PlanType.STARTER,
      status: this.mapStripeStatus(stripeSubscription.status),
      billingCycle: billingCycle || BillingCycle.MONTHLY,
      paymentProvider: PaymentProvider.STRIPE,
      externalSubscriptionId: stripeSubscription.id,
      externalCustomerId: stripeSubscription.customer as string,
      amount: stripeSubscription.items.data[0]?.price?.unit_amount
        ? stripeSubscription.items.data[0].price.unit_amount / 100
        : 0,
      currency: stripeSubscription.currency.toUpperCase(),
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialEndsAt: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : undefined,
    });

    await this.subscriptionRepository.save(subscription);

    // Update quota
    await this.quotaService.updatePlan(teamId, plan || PlanType.STARTER);

    this.logger.log(`Created subscription for team ${teamId}`);
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { externalSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found: ${stripeSubscription.id}`);
      return;
    }

    subscription.status = this.mapStripeStatus(stripeSubscription.status);
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

    if (stripeSubscription.canceled_at) {
      subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
    }

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Updated subscription ${stripeSubscription.id}`);
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { externalSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      return;
    }

    subscription.status = SubscriptionStatus.CANCELED;
    subscription.canceledAt = new Date();
    await this.subscriptionRepository.save(subscription);

    // Downgrade to free plan
    await this.quotaService.updatePlan(subscription.teamId, PlanType.FREE);

    this.logger.log(`Subscription deleted for team ${subscription.teamId}`);
  }

  private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
    // Find or create local invoice
    let invoice = await this.invoiceRepository.findOne({
      where: { externalInvoiceId: stripeInvoice.id },
    });

    if (!invoice) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { externalSubscriptionId: stripeInvoice.subscription as string },
      });

      if (!subscription) {
        return;
      }

      invoice = this.invoiceRepository.create({
        teamId: subscription.teamId,
        subscriptionId: subscription.id,
        invoiceNumber: stripeInvoice.number || `INV-${stripeInvoice.id}`,
        paymentProvider: PaymentProvider.STRIPE,
        externalInvoiceId: stripeInvoice.id,
        subtotal: (stripeInvoice.subtotal || 0) / 100,
        tax: (stripeInvoice.tax || 0) / 100,
        total: (stripeInvoice.total || 0) / 100,
        currency: stripeInvoice.currency.toUpperCase(),
        status: 'paid',
        dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : new Date(),
        paidAt: new Date(),
        pdfUrl: stripeInvoice.invoice_pdf || undefined,
        lineItems: stripeInvoice.lines.data.map(line => ({
          description: line.description || 'Subscription',
          quantity: line.quantity || 1,
          unitPrice: (line.price?.unit_amount || 0) / 100,
          amount: (line.amount || 0) / 100,
        })),
      });
    } else {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      invoice.pdfUrl = stripeInvoice.invoice_pdf || undefined;
    }

    await this.invoiceRepository.save(invoice);

    this.logger.log(`Invoice ${stripeInvoice.id} marked as paid`);
  }

  private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { externalInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      invoice.status = 'failed';
      await this.invoiceRepository.save(invoice);
    }

    // Update subscription status to past_due
    const subscription = await this.subscriptionRepository.findOne({
      where: { externalSubscriptionId: stripeInvoice.subscription as string },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.PAST_DUE;
      await this.subscriptionRepository.save(subscription);
    }

    this.logger.warn(`Invoice payment failed: ${stripeInvoice.id}`);

    // TODO: Send notification to team owner
  }

  private async handleTrialWillEnd(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { externalSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      this.logger.log(`Trial ending soon for team ${subscription.teamId}`);
      // TODO: Send notification to team owner
    }
  }

  // ========== Helper Methods ==========

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const mapping: Record<string, SubscriptionStatus> = {
      'active': SubscriptionStatus.ACTIVE,
      'past_due': SubscriptionStatus.PAST_DUE,
      'canceled': SubscriptionStatus.CANCELED,
      'trialing': SubscriptionStatus.TRIALING,
      'paused': SubscriptionStatus.PAUSED,
      'unpaid': SubscriptionStatus.PAST_DUE,
      'incomplete': SubscriptionStatus.TRIALING,
      'incomplete_expired': SubscriptionStatus.CANCELED,
    };
    return mapping[status] || SubscriptionStatus.ACTIVE;
  }
}
