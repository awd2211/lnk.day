import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, DEFAULT_PLANS, PlanLimits, PlanFeatures, PlanPricing, OveragePricing } from './plan.entity';

export interface CreatePlanDto {
  code: string;
  name: string;
  description?: string;
  limits: PlanLimits;
  features: PlanFeatures;
  pricing: PlanPricing;
  overagePricing?: OveragePricing;
  sortOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
  isPublic?: boolean;
  trialDays?: number;
  trialRequiresCreditCard?: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  badgeText?: string;
  badgeColor?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {}

@Injectable()
export class PlanService implements OnModuleInit {
  private readonly logger = new Logger(PlanService.name);
  private planCache: Map<string, Plan> = new Map();

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultPlans();
    await this.refreshCache();
  }

  /**
   * 初始化默认套餐
   */
  private async initializeDefaultPlans(): Promise<void> {
    const existingPlans = await this.planRepository.count();

    if (existingPlans === 0) {
      this.logger.log('Initializing default plans...');

      for (const planData of DEFAULT_PLANS) {
        const plan = this.planRepository.create(planData);
        await this.planRepository.save(plan);
        this.logger.log(`Created plan: ${planData.code}`);
      }

      this.logger.log('Default plans initialized successfully');
    }
  }

  /**
   * 刷新缓存
   */
  async refreshCache(): Promise<void> {
    const plans = await this.planRepository.find({ where: { isActive: true } });
    this.planCache.clear();
    for (const plan of plans) {
      this.planCache.set(plan.code, plan);
    }
    this.logger.log(`Plan cache refreshed: ${plans.length} plans loaded`);
  }

  /**
   * 获取所有套餐
   */
  async findAll(includeInactive = false): Promise<Plan[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.planRepository.find({
      where,
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * 获取公开的套餐（用于定价页面）
   */
  async findPublic(): Promise<Plan[]> {
    return this.planRepository.find({
      where: { isActive: true, isPublic: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * 根据ID获取套餐
   */
  async findById(id: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }
    return plan;
  }

  /**
   * 根据代码获取套餐
   */
  async findByCode(code: string): Promise<Plan> {
    // 先从缓存获取
    if (this.planCache.has(code)) {
      return this.planCache.get(code)!;
    }

    const plan = await this.planRepository.findOne({ where: { code } });
    if (!plan) {
      throw new NotFoundException(`Plan with code ${code} not found`);
    }
    return plan;
  }

  /**
   * 获取默认套餐
   */
  async findDefault(): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { isDefault: true } });
    if (!plan) {
      throw new NotFoundException('No default plan configured');
    }
    return plan;
  }

  /**
   * 获取套餐统计
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    public: number;
    byCode: Record<string, { subscriberCount: number; mrr: number }>;
  }> {
    const plans = await this.planRepository.find();

    return {
      total: plans.length,
      active: plans.filter(p => p.isActive).length,
      public: plans.filter(p => p.isPublic).length,
      byCode: plans.reduce((acc, plan) => {
        acc[plan.code] = {
          subscriberCount: 0, // 需要从订阅表统计
          mrr: 0,
        };
        return acc;
      }, {} as Record<string, { subscriberCount: number; mrr: number }>),
    };
  }

  /**
   * 创建套餐
   */
  async create(dto: CreatePlanDto): Promise<Plan> {
    // 检查代码是否已存在
    const existing = await this.planRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Plan with code ${dto.code} already exists`);
    }

    // 如果设置为默认，取消其他默认
    if (dto.isDefault) {
      await this.planRepository.update({ isDefault: true }, { isDefault: false });
    }

    const plan = this.planRepository.create(dto);
    const saved = await this.planRepository.save(plan);

    await this.refreshCache();
    return saved;
  }

  /**
   * 更新套餐
   */
  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findById(id);

    // 如果更改代码，检查是否冲突
    if (dto.code && dto.code !== plan.code) {
      const existing = await this.planRepository.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`Plan with code ${dto.code} already exists`);
      }
    }

    // 如果设置为默认，取消其他默认
    if (dto.isDefault && !plan.isDefault) {
      await this.planRepository.update({ isDefault: true }, { isDefault: false });
    }

    Object.assign(plan, dto);
    const saved = await this.planRepository.save(plan);

    await this.refreshCache();
    return saved;
  }

  /**
   * 删除套餐
   */
  async delete(id: string): Promise<void> {
    const plan = await this.findById(id);

    if (plan.isDefault) {
      throw new ConflictException('Cannot delete the default plan');
    }

    // TODO: 检查是否有用户正在使用此套餐

    await this.planRepository.remove(plan);
    await this.refreshCache();
  }

  /**
   * 切换套餐激活状态
   */
  async toggleActive(id: string): Promise<Plan> {
    const plan = await this.findById(id);
    plan.isActive = !plan.isActive;
    const saved = await this.planRepository.save(plan);
    await this.refreshCache();
    return saved;
  }

  /**
   * 复制套餐
   */
  async duplicate(id: string, newCode: string, newName: string): Promise<Plan> {
    const source = await this.findById(id);

    const dto: CreatePlanDto = {
      code: newCode,
      name: newName,
      description: source.description,
      limits: { ...source.limits },
      features: { ...source.features },
      pricing: { ...source.pricing },
      overagePricing: source.overagePricing ? { ...source.overagePricing } : undefined,
      sortOrder: source.sortOrder + 1,
      isActive: false,
      isDefault: false,
      isPublic: false,
      trialDays: source.trialDays,
      trialRequiresCreditCard: source.trialRequiresCreditCard,
      badgeText: undefined,
      badgeColor: undefined,
    };

    return this.create(dto);
  }

  /**
   * 更新排序顺序
   */
  async updateSortOrder(orders: { id: string; sortOrder: number }[]): Promise<void> {
    for (const { id, sortOrder } of orders) {
      await this.planRepository.update(id, { sortOrder });
    }
    await this.refreshCache();
  }

  /**
   * 获取套餐限制（用于配额检查）
   */
  async getPlanLimits(code: string): Promise<PlanLimits> {
    const plan = await this.findByCode(code);
    return plan.limits;
  }

  /**
   * 获取套餐功能（用于功能检查）
   */
  async getPlanFeatures(code: string): Promise<PlanFeatures> {
    const plan = await this.findByCode(code);
    return plan.features;
  }

  /**
   * 比较两个套餐
   */
  async comparePlans(code1: string, code2: string): Promise<{
    plan1: Plan;
    plan2: Plan;
    limitsDiff: Partial<PlanLimits>;
    featuresDiff: Partial<PlanFeatures>;
  }> {
    const plan1 = await this.findByCode(code1);
    const plan2 = await this.findByCode(code2);

    const limitsDiff: Partial<PlanLimits> = {};
    const featuresDiff: Partial<PlanFeatures> = {};

    // 比较限制
    for (const key of Object.keys(plan1.limits) as (keyof PlanLimits)[]) {
      if (plan1.limits[key] !== plan2.limits[key]) {
        limitsDiff[key] = plan2.limits[key] as any;
      }
    }

    // 比较功能
    for (const key of Object.keys(plan1.features) as (keyof PlanFeatures)[]) {
      if (plan1.features[key] !== plan2.features[key]) {
        featuresDiff[key] = plan2.features[key];
      }
    }

    return { plan1, plan2, limitsDiff, featuresDiff };
  }
}
