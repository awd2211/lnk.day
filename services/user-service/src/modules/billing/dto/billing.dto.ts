import { IsString, IsEnum, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '../../quota/quota.entity';
import { BillingCycle, PaymentProvider } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({ enum: PlanType })
  @IsEnum(PlanType)
  plan: PlanType;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional({ enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCode?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: PlanType })
  @IsOptional()
  @IsEnum(PlanType)
  plan?: PlanType;

  @ApiPropertyOptional({ enum: BillingCycle })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Cancel at end of billing period' })
  @IsOptional()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddPaymentMethodDto {
  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({ description: 'Payment method token from provider' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ description: 'Set as default payment method' })
  @IsOptional()
  setAsDefault?: boolean;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({ enum: PlanType })
  @IsEnum(PlanType)
  plan: PlanType;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiProperty({ description: 'Success redirect URL' })
  @IsString()
  successUrl: string;

  @ApiProperty({ description: 'Cancel redirect URL' })
  @IsString()
  cancelUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCode?: string;
}

// Response DTOs

export class PricingPlanDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Plan code like free, starter, pro, enterprise' })
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  priceMonthly: number;

  @ApiProperty()
  priceYearly: number;

  @ApiPropertyOptional()
  priceIdMonthly?: string;

  @ApiPropertyOptional()
  priceIdYearly?: string;

  @ApiProperty()
  features: string[];

  @ApiProperty()
  limits: {
    links: number;
    clicks: number;
    customDomains: number;
    teamMembers: number;
    apiRequests: number;
  };

  @ApiPropertyOptional()
  popular?: boolean;
}

export class PricingResponseDto {
  @ApiProperty({ type: [PricingPlanDto] })
  plans: PricingPlanDto[];
}

// Legacy format for backward compatibility
export class PricingDto {
  @ApiProperty()
  plan: PlanType;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  monthlyPrice: number;

  @ApiProperty()
  yearlyPrice: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  features: string[];

  @ApiProperty()
  limits: {
    maxLinks: number;
    maxClicks: number;
    maxQrCodes: number;
    maxTeamMembers: number;
    maxCustomDomains: number;
  };
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  plan: PlanType;

  @ApiProperty()
  status: string;

  @ApiProperty()
  billingCycle: BillingCycle;

  @ApiProperty()
  currentPeriodStart: Date;

  @ApiProperty()
  currentPeriodEnd: Date;

  @ApiPropertyOptional()
  trialEndsAt?: Date;

  @ApiProperty()
  cancelAtPeriodEnd: boolean;
}
