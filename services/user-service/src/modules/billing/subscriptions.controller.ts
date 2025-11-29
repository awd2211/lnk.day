import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { Subscription, SubscriptionStatus, Invoice } from './entities/subscription.entity';
import { PlanType } from '../quota/quota.entity';
import { UpdateSubscriptionDto, CancelSubscriptionDto } from './dto/billing.dto';
import { Team } from '../team/entities/team.entity';
import { User } from '../user/entities/user.entity';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(
    private readonly billingService: BillingService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get subscription statistics' })
  async getStats() {
    const [total, active, trialing, canceled, pastDue] = await Promise.all([
      this.subscriptionRepository.count(),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.TRIALING } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.CANCELED } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
    ]);

    // Count by plan
    const byPlan = await this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('sub.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('sub.plan')
      .getRawMany();

    // Monthly revenue
    const monthlyRevenue = await this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('SUM(sub.amount)', 'total')
      .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE })
      .getRawOne();

    return {
      total,
      active,
      trialing,
      canceled,
      pastDue,
      byPlan: byPlan.map(p => ({ plan: p.plan, count: parseInt(p.count, 10) })),
      monthlyRevenue: parseFloat(monthlyRevenue?.total || '0'),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all subscriptions' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const skip = (page - 1) * limit;

    // Build query with user info via team relationship
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('sub')
      .leftJoin('teams', 'team', 'team.id::text = sub."teamId"')
      .leftJoin('users', 'owner', 'owner.id = team."ownerId"::uuid')
      .select([
        'sub.id as id',
        'sub."teamId" as "teamId"',
        'sub.plan as plan',
        'sub.status as status',
        'sub."billingCycle" as "billingCycle"',
        'sub.amount as amount',
        'sub.currency as currency',
        'sub."currentPeriodStart" as "currentPeriodStart"',
        'sub."currentPeriodEnd" as "currentPeriodEnd"',
        'sub."trialEndsAt" as "trialEndsAt"',
        'sub."cancelAtPeriodEnd" as "cancelAtPeriodEnd"',
        'sub."createdAt" as "createdAt"',
        'team."ownerId" as "userId"',
        'owner.name as "userName"',
        'owner.email as "userEmail"',
        'team.name as "teamName"',
      ]);

    if (plan) {
      queryBuilder.andWhere('sub.plan = :plan', { plan });
    }
    if (status) {
      queryBuilder.andWhere('sub.status = :status', { status });
    }
    if (search) {
      queryBuilder.andWhere(
        '(owner.name ILIKE :search OR owner.email ILIKE :search OR team.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count
    const total = await this.subscriptionRepository
      .createQueryBuilder('sub')
      .leftJoin('teams', 'team', 'team.id::text = sub."teamId"')
      .leftJoin('users', 'owner', 'owner.id = team."ownerId"::uuid')
      .where(plan ? 'sub.plan = :plan' : '1=1', { plan })
      .andWhere(status ? 'sub.status = :status' : '1=1', { status })
      .andWhere(
        search
          ? '(owner.name ILIKE :search OR owner.email ILIKE :search OR team.name ILIKE :search)'
          : '1=1',
        { search: `%${search}%` },
      )
      .getCount();

    const items = await queryBuilder
      .orderBy('sub."createdAt"', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  async findOne(@Param('id') id: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  @Patch(':id/plan')
  @ApiOperation({ summary: 'Change subscription plan' })
  async changePlan(
    @Param('id') id: string,
    @Body() dto: { plan: string; billingCycle?: 'monthly' | 'annual' },
  ) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return this.billingService.updateSubscription(subscription.teamId, {
      plan: dto.plan as PlanType,
      billingCycle: dto.billingCycle as any,
    });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancel(
    @Param('id') id: string,
    @Body() dto?: { immediately?: boolean; reason?: string },
  ) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return this.billingService.cancelSubscription(subscription.teamId, {
      cancelAtPeriodEnd: !dto?.immediately,
    });
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate canceled subscription' })
  async reactivate(@Param('id') id: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return this.billingService.reactivateSubscription(subscription.teamId);
  }

  @Post(':id/extend-trial')
  @ApiOperation({ summary: 'Extend trial period' })
  async extendTrial(
    @Param('id') id: string,
    @Body() dto: { days: number },
  ) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    if (subscription.status !== SubscriptionStatus.TRIALING) {
      throw new NotFoundException('Only trialing subscriptions can be extended');
    }

    const currentTrialEnd = subscription.trialEndsAt || new Date();
    const newTrialEnd = new Date(currentTrialEnd.getTime() + dto.days * 24 * 60 * 60 * 1000);

    subscription.trialEndsAt = newTrialEnd;
    return this.subscriptionRepository.save(subscription);
  }

  @Get(':id/invoices')
  @ApiOperation({ summary: 'Get invoices for a subscription' })
  async getInvoices(@Param('id') id: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return this.invoiceRepository.find({
      where: { subscriptionId: id },
      order: { createdAt: 'DESC' },
    });
  }

  @Post(':id/invoices/:invoiceId/refund')
  @ApiOperation({ summary: 'Refund an invoice' })
  async refundInvoice(
    @Param('id') subscriptionId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto?: { amount?: number; reason?: string },
  ) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, subscriptionId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found`);
    }

    // Mark as refunded
    invoice.status = 'refunded';
    invoice.refundedAt = new Date();
    invoice.refundAmount = dto?.amount || invoice.total;
    invoice.refundReason = dto?.reason;

    return this.invoiceRepository.save(invoice);
  }
}
