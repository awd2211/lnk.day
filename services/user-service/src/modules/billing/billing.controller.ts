import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

import { BillingService } from './billing.service';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  AddPaymentMethodDto,
} from './dto/billing.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ========== Pricing ==========

  @Get('pricing')
  @ApiOperation({ summary: '获取定价信息' })
  getPricing() {
    return this.billingService.getPricing();
  }

  // ========== Subscription ==========

  @Get('subscription')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取当前订阅' })
  getSubscription(@ScopedTeamId() teamId: string) {
    return this.billingService.getSubscription(teamId);
  }

  @Post('subscription')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '创建订阅' })
  createSubscription(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.billingService.createSubscription(teamId, dto);
  }

  @Put('subscription')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '更新订阅' })
  updateSubscription(
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.billingService.updateSubscription(teamId, dto);
  }

  @Post('subscription/cancel')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '取消订阅' })
  cancelSubscription(
    @ScopedTeamId() teamId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.billingService.cancelSubscription(teamId, dto);
  }

  @Post('subscription/reactivate')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '恢复订阅' })
  reactivateSubscription(@ScopedTeamId() teamId: string) {
    return this.billingService.reactivateSubscription(teamId);
  }

  // ========== Invoices ==========

  @Get('invoices')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取发票列表' })
  getInvoices(@ScopedTeamId() teamId: string) {
    return this.billingService.getInvoices(teamId);
  }

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取单个发票' })
  getInvoice(@Param('id') id: string) {
    return this.billingService.getInvoice(id);
  }

  // ========== Payment Methods ==========

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取支付方式列表' })
  getPaymentMethods(@ScopedTeamId() teamId: string) {
    return this.billingService.getPaymentMethods(teamId);
  }

  @Post('payment-methods')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '添加支付方式' })
  addPaymentMethod(
    @ScopedTeamId() teamId: string,
    @Body() dto: AddPaymentMethodDto,
  ) {
    return this.billingService.addPaymentMethod(teamId, dto);
  }

  @Delete('payment-methods/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '删除支付方式' })
  removePaymentMethod(
    @ScopedTeamId() teamId: string,
    @Param('id') id: string,
  ) {
    return this.billingService.removePaymentMethod(teamId, id);
  }

  @Post('payment-methods/:id/default')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_EDIT)
  @ApiOperation({ summary: '设置默认支付方式' })
  setDefaultPaymentMethod(
    @ScopedTeamId() teamId: string,
    @Param('id') id: string,
  ) {
    return this.billingService.setDefaultPaymentMethod(teamId, id);
  }

  // ========== Overview ==========

  @Get('overview')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取计费概览' })
  getBillingOverview(@ScopedTeamId() teamId: string) {
    return this.billingService.getBillingOverview(teamId);
  }
}
