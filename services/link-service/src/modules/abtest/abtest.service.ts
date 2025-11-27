import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { ABTest, ABTestStatus, ABTestVariant } from './abtest.entity';
import { CreateABTestDto } from './dto/create-abtest.dto';

@Injectable()
export class ABTestService {
  constructor(
    @InjectRepository(ABTest)
    private readonly abtestRepository: Repository<ABTest>,
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
    }));

    const abtest = this.abtestRepository.create({
      ...createDto,
      variants,
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
    }>;
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
    }));

    return { test: abtest, variants };
  }
}
