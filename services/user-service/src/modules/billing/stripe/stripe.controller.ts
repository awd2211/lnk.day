import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  RawBodyRequest,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BillingCycle } from '../entities/subscription.entity';
import { PlanType } from '../../quota/quota.entity';

class CreateCheckoutDto {
  plan: PlanType;
  billingCycle: BillingCycle;
}

class ChangePlanDto {
  plan: PlanType;
  billingCycle: BillingCycle;
}

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  // ========== Checkout ==========

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 Stripe Checkout 会话' })
  @ApiBody({ type: CreateCheckoutDto })
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Req() req: any,
  ) {
    const teamId = req.user.teamId || req.user.id; // Use teamId or userId as fallback
    const email = req.user.email;

    return this.stripeService.createCheckoutSession(
      teamId,
      email,
      dto.plan,
      dto.billingCycle,
    );
  }

  @Get('checkout/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 Checkout 会话状态' })
  async getCheckoutSession(@Param('sessionId') sessionId: string) {
    const session = await this.stripeService.getCheckoutSession(sessionId);
    return {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
    };
  }

  // ========== Billing Portal ==========

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 Stripe 账单门户会话' })
  async createPortalSession(@Req() req: any) {
    const teamId = req.user.teamId || req.user.id;
    return this.stripeService.createBillingPortalSession(teamId);
  }

  // ========== Subscription Management ==========

  @Post('subscription/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消订阅' })
  async cancelSubscription(
    @Body() body: { cancelAtPeriodEnd?: boolean },
    @Req() req: any,
  ) {
    const teamId = req.user.teamId || req.user.id;
    // Get subscription ID from database
    // This would need to look up the subscription first
    return { message: '请使用账单门户管理订阅' };
  }

  @Post('subscription/reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '重新激活订阅' })
  async reactivateSubscription(@Req() req: any) {
    const teamId = req.user.teamId || req.user.id;
    return { message: '请使用账单门户管理订阅' };
  }

  @Post('subscription/change-plan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更改订阅计划' })
  @ApiBody({ type: ChangePlanDto })
  async changePlan(
    @Body() dto: ChangePlanDto,
    @Req() req: any,
  ) {
    const teamId = req.user.teamId || req.user.id;
    return { message: '请使用账单门户管理订阅' };
  }

  // ========== Payment Methods ==========

  @Post('setup-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 SetupIntent 用于添加支付方式' })
  async createSetupIntent(@Req() req: any) {
    const email = req.user.email;
    const teamId = req.user.teamId || req.user.id;

    const customerId = await this.stripeService.createOrGetCustomer(teamId, email);
    return this.stripeService.createSetupIntent(customerId);
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取支付方式列表' })
  async listPaymentMethods(@Req() req: any) {
    const teamId = req.user.teamId || req.user.id;
    const email = req.user.email;

    const customerId = await this.stripeService.createOrGetCustomer(teamId, email);
    const methods = await this.stripeService.listPaymentMethods(customerId);

    return methods.map(m => ({
      id: m.id,
      brand: m.card?.brand,
      last4: m.card?.last4,
      expiryMonth: m.card?.exp_month,
      expiryYear: m.card?.exp_year,
    }));
  }

  @Post('payment-methods/:id/default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置默认支付方式' })
  async setDefaultPaymentMethod(
    @Param('id') paymentMethodId: string,
    @Req() req: any,
  ) {
    const teamId = req.user.teamId || req.user.id;
    const email = req.user.email;

    const customerId = await this.stripeService.createOrGetCustomer(teamId, email);
    await this.stripeService.setDefaultPaymentMethod(customerId, paymentMethodId);

    return { success: true };
  }

  // ========== Invoices ==========

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取发票列表' })
  async listInvoices(
    @Query('limit') limit: number = 10,
    @Req() req: any,
  ) {
    const teamId = req.user.teamId || req.user.id;
    const email = req.user.email;

    const customerId = await this.stripeService.createOrGetCustomer(teamId, email);
    const invoices = await this.stripeService.listStripeInvoices(customerId, limit);

    return invoices.map(inv => ({
      id: inv.id,
      number: inv.number,
      amount: (inv.total || 0) / 100,
      currency: inv.currency,
      status: inv.status,
      paidAt: inv.status_transitions?.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000)
        : null,
      pdfUrl: inv.invoice_pdf,
      createdAt: new Date(inv.created * 1000),
    }));
  }

  @Get('invoices/:id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取发票 PDF 下载链接' })
  async getInvoicePdf(@Param('id') invoiceId: string) {
    const pdfUrl = await this.stripeService.downloadInvoicePdf(invoiceId);
    return { url: pdfUrl };
  }

  // ========== Webhook ==========

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe Webhook 处理端点' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(rawBody, signature);
      await this.stripeService.handleWebhookEvent(event);

      return { received: true };
    } catch (error: any) {
      this.logger.error(`Webhook error: ${error.message}`);
      throw new BadRequestException(`Webhook Error: ${error.message}`);
    }
  }
}
