import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import {
  ABTest,
  ABTestEvent,
  ABTestStatus,
  ABTestMetric,
  ABTestVariant,
  ABTestSettings,
  StatisticalResult,
} from './abtest.entity';
import { CreateABTestDto } from './dto/create-abtest.dto';

// Z-scores for confidence levels
const Z_SCORES: Record<number, number> = {
  0.90: 1.645,
  0.95: 1.96,
  0.99: 2.576,
};

@Injectable()
export class ABTestService {
  private readonly logger = new Logger(ABTestService.name);

  constructor(
    @InjectRepository(ABTest)
    private readonly abtestRepository: Repository<ABTest>,
    @InjectRepository(ABTestEvent)
    private readonly eventRepository: Repository<ABTestEvent>,
  ) {}

  async create(
    createDto: CreateABTestDto,
    userId: string,
    teamId: string,
  ): Promise<ABTest> {
    // Validate traffic percentages sum to 100
    const totalPercentage = createDto.variants.reduce(
      (sum, v) => sum + v.trafficPercentage,
      0,
    );
    if (totalPercentage !== 100) {
      throw new BadRequestException(
        'Traffic percentages must sum to 100',
      );
    }

    // Add IDs to variants
    const variants: ABTestVariant[] = createDto.variants.map((v) => ({
      ...v,
      id: uuidv4(),
      clicks: 0,
      conversions: 0,
      revenue: 0,
      bounces: 0,
      totalTimeOnPage: 0,
      uniqueVisitors: 0,
    }));

    // Default settings
    const settings: ABTestSettings = {
      minimumSampleSize: createDto.minimumSampleSize || 1000,
      confidenceLevel: createDto.confidenceLevel || 0.95,
      primaryMetric: createDto.primaryMetric || ABTestMetric.CONVERSION_RATE,
      autoComplete: createDto.autoComplete ?? true,
      autoSelectWinner: createDto.autoSelectWinner ?? true,
      maxDuration: createDto.maxDuration,
      minConversions: createDto.minConversions || 100,
      trafficAllocationMethod: createDto.trafficAllocationMethod || 'weighted',
    };

    const abtest = this.abtestRepository.create({
      ...createDto,
      variants,
      settings,
      userId,
      teamId,
    });

    return this.abtestRepository.save(abtest);
  }

  async findAll(teamId: string): Promise<ABTest[]> {
    return this.abtestRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByLinkId(linkId: string): Promise<ABTest | null> {
    return this.abtestRepository.findOne({
      where: { linkId, status: ABTestStatus.RUNNING },
    });
  }

  async findOne(id: string): Promise<ABTest> {
    const abtest = await this.abtestRepository.findOne({ where: { id } });
    if (!abtest) {
      throw new NotFoundException(`A/B Test with ID ${id} not found`);
    }
    return abtest;
  }

  async start(id: string): Promise<ABTest> {
    const abtest = await this.findOne(id);

    if (abtest.status === ABTestStatus.RUNNING) {
      throw new BadRequestException('Test is already running');
    }

    // Check if another test is running for the same link
    const existing = await this.findByLinkId(abtest.linkId);
    if (existing && existing.id !== id) {
      throw new BadRequestException(
        'Another A/B test is already running for this link',
      );
    }

    abtest.status = ABTestStatus.RUNNING;
    abtest.startedAt = new Date();

    return this.abtestRepository.save(abtest);
  }

  async pause(id: string): Promise<ABTest> {
    const abtest = await this.findOne(id);

    if (abtest.status !== ABTestStatus.RUNNING) {
      throw new BadRequestException('Test is not running');
    }

    abtest.status = ABTestStatus.PAUSED;
    return this.abtestRepository.save(abtest);
  }

  async complete(id: string, winnerVariantId?: string): Promise<ABTest> {
    const abtest = await this.findOne(id);

    if (winnerVariantId) {
      const variantExists = abtest.variants.some(
        (v) => v.id === winnerVariantId,
      );
      if (!variantExists) {
        throw new BadRequestException('Invalid winner variant ID');
      }
      abtest.winnerVariantId = winnerVariantId;
    }

    abtest.status = ABTestStatus.COMPLETED;
    abtest.completedAt = new Date();

    return this.abtestRepository.save(abtest);
  }

  async remove(id: string): Promise<void> {
    const abtest = await this.findOne(id);
    await this.abtestRepository.remove(abtest);
  }

  async updateVariantStats(
    id: string,
    variantId: string,
    clicks: number,
    conversions: number,
  ): Promise<ABTest> {
    const abtest = await this.findOne(id);

    const variant = abtest.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new BadRequestException('Variant not found');
    }

    variant.clicks = (variant.clicks || 0) + clicks;
    variant.conversions = (variant.conversions || 0) + conversions;
    abtest.totalClicks += clicks;

    return this.abtestRepository.save(abtest);
  }

  /**
   * Select variant based on consistent hashing of visitor identifier
   * This ensures the same visitor always sees the same variant
   */
  selectVariant(abtest: ABTest, visitorId: string): ABTestVariant {
    // Create hash from visitor ID
    const hash = createHash('md5').update(visitorId).digest('hex');
    const hashNumber = parseInt(hash.substring(0, 8), 16);
    const percentage = (hashNumber % 100) + 1;

    // Select variant based on cumulative percentage
    let cumulative = 0;
    for (const variant of abtest.variants) {
      cumulative += variant.trafficPercentage;
      if (percentage <= cumulative) {
        return variant;
      }
    }

    // Fallback to first variant
    return abtest.variants[0]!;
  }

  async getStats(id: string): Promise<{
    test: ABTest;
    variants: Array<{
      id: string;
      name: string;
      clicks: number;
      conversions: number;
      conversionRate: number;
      clickPercentage: number;
      revenue: number;
      avgRevenuePerClick: number;
    }>;
    statisticalAnalysis: Record<string, StatisticalResult>;
    recommendation: string;
  }> {
    const abtest = await this.findOne(id);

    const variants = abtest.variants.map((v) => ({
      id: v.id,
      name: v.name,
      clicks: v.clicks || 0,
      conversions: v.conversions || 0,
      conversionRate: v.clicks
        ? ((v.conversions || 0) / v.clicks) * 100
        : 0,
      clickPercentage: abtest.totalClicks
        ? ((v.clicks || 0) / abtest.totalClicks) * 100
        : 0,
      revenue: v.revenue || 0,
      avgRevenuePerClick: v.clicks
        ? (v.revenue || 0) / v.clicks
        : 0,
    }));

    const statisticalAnalysis = this.calculateStatisticalSignificance(abtest);
    const recommendation = this.generateRecommendation(abtest, statisticalAnalysis);

    return { test: abtest, variants, statisticalAnalysis, recommendation };
  }

  // Record individual events
  async recordEvent(
    testId: string,
    variantId: string,
    visitorId: string,
    eventType: 'click' | 'conversion' | 'bounce' | 'engagement',
    data?: {
      value?: number;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      country?: string;
      device?: string;
    },
  ): Promise<void> {
    const event = this.eventRepository.create({
      testId,
      variantId,
      visitorId,
      eventType,
      value: data?.value,
      metadata: data?.metadata,
      ipAddress: data?.ipAddress,
      userAgent: data?.userAgent,
      country: data?.country,
      device: data?.device,
    });

    await this.eventRepository.save(event);

    // Update variant stats
    const abtest = await this.findOne(testId);
    const variant = abtest.variants.find((v) => v.id === variantId);

    if (variant) {
      switch (eventType) {
        case 'click':
          variant.clicks = (variant.clicks || 0) + 1;
          abtest.totalClicks += 1;
          break;
        case 'conversion':
          variant.conversions = (variant.conversions || 0) + 1;
          variant.revenue = (variant.revenue || 0) + (data?.value || 0);
          abtest.totalConversions += 1;
          abtest.totalRevenue = Number(abtest.totalRevenue) + (data?.value || 0);
          break;
        case 'bounce':
          variant.bounces = (variant.bounces || 0) + 1;
          break;
      }

      await this.abtestRepository.save(abtest);

      // Check if test should auto-complete
      if (abtest.settings.autoComplete) {
        await this.checkAutoComplete(abtest);
      }
    }
  }

  // Calculate statistical significance using Z-test for proportions
  calculateStatisticalSignificance(abtest: ABTest): Record<string, StatisticalResult> {
    const results: Record<string, StatisticalResult> = {};
    const variants = abtest.variants;

    if (variants.length < 2) return results;

    // Use first variant as control
    const control = variants[0];
    const controlRate = control.clicks ? (control.conversions || 0) / control.clicks : 0;

    for (let i = 1; i < variants.length; i++) {
      const variant = variants[i];
      const variantRate = variant.clicks ? (variant.conversions || 0) / variant.clicks : 0;

      const result = this.performZTest(
        control.clicks || 0,
        control.conversions || 0,
        variant.clicks || 0,
        variant.conversions || 0,
        abtest.settings.confidenceLevel,
      );

      results[variant.id] = result;
    }

    return results;
  }

  private performZTest(
    controlN: number,
    controlConversions: number,
    variantN: number,
    variantConversions: number,
    confidenceLevel: number,
  ): StatisticalResult {
    if (controlN === 0 || variantN === 0) {
      return {
        isSignificant: false,
        confidenceLevel,
        pValue: 1,
        uplift: 0,
        powerAnalysis: 0,
        recommendedSampleSize: 1000,
      };
    }

    const p1 = controlConversions / controlN;
    const p2 = variantConversions / variantN;

    // Pooled proportion
    const pooledP = (controlConversions + variantConversions) / (controlN + variantN);

    // Standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / controlN + 1 / variantN));

    // Z-score
    const z = se > 0 ? (p2 - p1) / se : 0;

    // Two-tailed p-value (approximation using standard normal distribution)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

    // Check significance
    const zCritical = Z_SCORES[confidenceLevel] || 1.96;
    const isSignificant = Math.abs(z) > zCritical;

    // Uplift calculation
    const uplift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

    // Power analysis (simplified)
    const powerAnalysis = this.calculatePower(controlN, variantN, p1, p2);

    // Recommended sample size for 80% power
    const recommendedSampleSize = this.calculateRequiredSampleSize(p1, p2, 0.8, confidenceLevel);

    return {
      isSignificant,
      confidenceLevel,
      pValue,
      uplift,
      powerAnalysis,
      recommendedSampleSize,
    };
  }

  // Normal CDF approximation
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private calculatePower(n1: number, n2: number, p1: number, p2: number): number {
    if (p1 === p2 || n1 === 0 || n2 === 0) return 0;

    const delta = Math.abs(p2 - p1);
    const pooledVar = p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2;
    const se = Math.sqrt(pooledVar);

    if (se === 0) return 0;

    const zAlpha = 1.96; // 95% confidence
    const zBeta = (delta - zAlpha * se) / se;

    return this.normalCDF(zBeta);
  }

  private calculateRequiredSampleSize(
    p1: number,
    p2: number,
    power: number,
    confidence: number,
  ): number {
    if (p1 === p2) return 10000;

    const delta = Math.abs(p2 - p1);
    const zAlpha = Z_SCORES[confidence] || 1.96;
    const zBeta = 0.84; // 80% power

    const pAvg = (p1 + p2) / 2;
    const variance = 2 * pAvg * (1 - pAvg);

    const n = Math.ceil((variance * Math.pow(zAlpha + zBeta, 2)) / Math.pow(delta, 2));
    return Math.max(n, 100);
  }

  private generateRecommendation(
    abtest: ABTest,
    results: Record<string, StatisticalResult>,
  ): string {
    const totalClicks = abtest.totalClicks;
    const minSample = abtest.settings.minimumSampleSize;

    if (totalClicks < minSample) {
      return `需要更多数据。当前样本量: ${totalClicks}, 建议最小样本量: ${minSample}`;
    }

    const significantResults = Object.entries(results).filter(([_, r]) => r.isSignificant);

    if (significantResults.length === 0) {
      return '目前没有统计显著性差异。建议继续收集数据或考虑测试不同的变体。';
    }

    const bestResult = significantResults.reduce((best, [id, r]) => {
      if (!best || r.uplift > best[1].uplift) return [id, r];
      return best;
    }, null as [string, StatisticalResult] | null);

    if (bestResult) {
      const variant = abtest.variants.find((v) => v.id === bestResult[0]);
      const uplift = bestResult[1].uplift.toFixed(2);
      return `推荐: "${variant?.name}" 显示出 ${uplift}% 的提升，置信度为 ${bestResult[1].confidenceLevel * 100}%。`;
    }

    return '继续监控测试以获得更明确的结果。';
  }

  // Auto-complete check
  private async checkAutoComplete(abtest: ABTest): Promise<void> {
    if (abtest.status !== ABTestStatus.RUNNING) return;

    const settings = abtest.settings;

    // Check minimum sample size
    if (abtest.totalClicks < settings.minimumSampleSize) return;

    // Check minimum conversions
    if (settings.minConversions && abtest.totalConversions < settings.minConversions) return;

    // Check statistical significance
    const results = this.calculateStatisticalSignificance(abtest);
    const hasSignificantResult = Object.values(results).some((r) => r.isSignificant);

    if (hasSignificantResult) {
      // Find winner
      let winnerId: string | undefined;
      let bestUplift = 0;

      for (const [variantId, result] of Object.entries(results)) {
        if (result.isSignificant && result.uplift > bestUplift) {
          bestUplift = result.uplift;
          winnerId = variantId;
        }
      }

      // If no clear winner among variants, control wins
      if (!winnerId || bestUplift <= 0) {
        winnerId = abtest.variants[0].id;
      }

      if (settings.autoSelectWinner) {
        abtest.winnerVariantId = winnerId;
        abtest.status = ABTestStatus.COMPLETED;
        abtest.completedAt = new Date();
        abtest.statisticalResults = results;

        await this.abtestRepository.save(abtest);
        this.logger.log(`A/B Test ${abtest.id} auto-completed with winner: ${winnerId}`);
      }
    }
  }

  // Check for tests that should end due to max duration
  @Cron(CronExpression.EVERY_HOUR)
  async checkTestDurations(): Promise<void> {
    const runningTests = await this.abtestRepository.find({
      where: { status: ABTestStatus.RUNNING },
    });

    for (const test of runningTests) {
      if (test.settings.maxDuration && test.startedAt) {
        const endDate = new Date(test.startedAt);
        endDate.setDate(endDate.getDate() + test.settings.maxDuration);

        if (new Date() >= endDate) {
          await this.complete(test.id);
          this.logger.log(`A/B Test ${test.id} auto-completed due to max duration`);
        }
      }

      if (test.scheduledEndDate && new Date() >= test.scheduledEndDate) {
        await this.complete(test.id);
        this.logger.log(`A/B Test ${test.id} auto-completed due to scheduled end date`);
      }
    }
  }

  // Multi-armed bandit traffic allocation
  async selectVariantBandit(abtest: ABTest, visitorId: string): Promise<ABTestVariant> {
    if (abtest.settings.trafficAllocationMethod !== 'bandit') {
      return this.selectVariant(abtest, visitorId);
    }

    // Thompson Sampling implementation
    const scores: Array<{ variant: ABTestVariant; score: number }> = [];

    for (const variant of abtest.variants) {
      const successes = (variant.conversions || 0) + 1;
      const failures = (variant.clicks || 0) - (variant.conversions || 0) + 1;

      // Beta distribution sampling (approximation)
      const score = this.sampleBeta(successes, failures);
      scores.push({ variant, score });
    }

    // Select variant with highest score
    scores.sort((a, b) => b.score - a.score);
    return scores[0].variant;
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Simplified beta sampling using gamma distribution approximation
    const u = this.sampleGamma(alpha);
    const v = this.sampleGamma(beta);
    return u / (u + v);
  }

  private sampleGamma(shape: number): number {
    // Simplified gamma sampling
    if (shape < 1) {
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.randomNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  private randomNormal(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Get detailed variant comparison
  async getVariantComparison(id: string): Promise<{
    variants: Array<{
      id: string;
      name: string;
      metrics: {
        clicks: number;
        conversions: number;
        conversionRate: number;
        revenue: number;
        avgOrderValue: number;
        bounceRate: number;
      };
      vsControl: {
        uplift: number;
        isSignificant: boolean;
        pValue: number;
      } | null;
    }>;
    winner: string | null;
    confidence: number;
  }> {
    const abtest = await this.findOne(id);
    const stats = this.calculateStatisticalSignificance(abtest);

    const control = abtest.variants[0];
    const variants = abtest.variants.map((v, index) => {
      const clicks = v.clicks || 0;
      const conversions = v.conversions || 0;
      const revenue = v.revenue || 0;
      const bounces = v.bounces || 0;

      return {
        id: v.id,
        name: v.name,
        metrics: {
          clicks,
          conversions,
          conversionRate: clicks ? (conversions / clicks) * 100 : 0,
          revenue,
          avgOrderValue: conversions ? revenue / conversions : 0,
          bounceRate: clicks ? (bounces / clicks) * 100 : 0,
        },
        vsControl: index === 0 ? null : stats[v.id] ? {
          uplift: stats[v.id].uplift,
          isSignificant: stats[v.id].isSignificant,
          pValue: stats[v.id].pValue,
        } : null,
      };
    });

    // Determine winner
    let winner: string | null = null;
    let maxUplift = 0;

    for (const [variantId, result] of Object.entries(stats)) {
      if (result.isSignificant && result.uplift > maxUplift) {
        maxUplift = result.uplift;
        winner = variantId;
      }
    }

    // If no significant winner found among variants, check if control is best
    if (!winner && abtest.totalClicks >= abtest.settings.minimumSampleSize) {
      const allNegative = Object.values(stats).every((r) => r.uplift <= 0);
      if (allNegative) {
        winner = control.id;
      }
    }

    return {
      variants,
      winner,
      confidence: abtest.settings.confidenceLevel,
    };
  }
}
