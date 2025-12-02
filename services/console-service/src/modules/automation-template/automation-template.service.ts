import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationTemplate, TemplateCategory } from './entities/automation-template.entity';
import { CreateAutomationTemplateDto } from './dto/create-automation-template.dto';
import { UpdateAutomationTemplateDto } from './dto/update-automation-template.dto';

@Injectable()
export class AutomationTemplateService {
  constructor(
    @InjectRepository(AutomationTemplate)
    private readonly automationTemplateRepo: Repository<AutomationTemplate>,
  ) {}

  async create(
    teamId: string,
    userId: string,
    dto: CreateAutomationTemplateDto,
  ): Promise<AutomationTemplate> {
    const template = this.automationTemplateRepo.create({
      ...dto,
      trigger: dto.trigger as AutomationTemplate['trigger'],
      actions: dto.actions as AutomationTemplate['actions'],
      conditions: dto.conditions as AutomationTemplate['conditions'],
      teamId,
      createdBy: userId,
    });
    return this.automationTemplateRepo.save(template);
  }

  async findAll(
    teamId: string,
    options?: {
      category?: TemplateCategory;
      isFavorite?: boolean;
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: AutomationTemplate[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.automationTemplateRepo
      .createQueryBuilder('template')
      .where('template.teamId = :teamId', { teamId });

    if (options?.category) {
      qb.andWhere('template.category = :category', { category: options.category });
    }

    if (options?.isFavorite !== undefined) {
      qb.andWhere('template.isFavorite = :isFavorite', { isFavorite: options.isFavorite });
    }

    if (options?.search) {
      qb.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options?.tags && options.tags.length > 0) {
      qb.andWhere('template.tags && :tags', { tags: options.tags });
    }

    qb.orderBy('template.isFavorite', 'DESC')
      .addOrderBy('template.usageCount', 'DESC')
      .addOrderBy('template.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, teamId: string): Promise<AutomationTemplate> {
    const template = await this.automationTemplateRepo.findOne({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException(`Automation template ${id} not found`);
    }

    return template;
  }

  async update(
    id: string,
    teamId: string,
    dto: UpdateAutomationTemplateDto,
  ): Promise<AutomationTemplate> {
    const template = await this.findOne(id, teamId);
    Object.assign(template, dto);
    return this.automationTemplateRepo.save(template);
  }

  async remove(id: string, teamId: string): Promise<void> {
    const template = await this.findOne(id, teamId);
    await this.automationTemplateRepo.remove(template);
  }

  async toggleFavorite(id: string, teamId: string): Promise<AutomationTemplate> {
    const template = await this.findOne(id, teamId);
    template.isFavorite = !template.isFavorite;
    return this.automationTemplateRepo.save(template);
  }

  async incrementUsage(id: string, teamId: string): Promise<AutomationTemplate> {
    const template = await this.findOne(id, teamId);
    template.usageCount += 1;
    template.lastUsedAt = new Date();
    return this.automationTemplateRepo.save(template);
  }

  async duplicate(id: string, teamId: string, userId: string): Promise<AutomationTemplate> {
    const original = await this.findOne(id, teamId);

    // Exclude id and timestamps
    const { id: _, createdAt: __, updatedAt: ___, lastUsedAt: ____, ...rest } = original;

    const duplicate = this.automationTemplateRepo.create({
      ...rest,
      name: `${original.name} (Copy)`,
      createdBy: userId,
      isFavorite: false,
      usageCount: 0,
    });

    return this.automationTemplateRepo.save(duplicate);
  }

  async getStats(teamId: string): Promise<{
    total: number;
    favorites: number;
    byCategory: Record<string, number>;
    byTriggerType: Record<string, number>;
    mostUsed: AutomationTemplate[];
    recentlyUsed: AutomationTemplate[];
  }> {
    const templates = await this.automationTemplateRepo.find({ where: { teamId } });

    const byCategory: Record<string, number> = {};
    const byTriggerType: Record<string, number> = {};

    templates.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byTriggerType[t.trigger.type] = (byTriggerType[t.trigger.type] || 0) + 1;
    });

    const mostUsed = [...templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    const recentlyUsed = [...templates]
      .filter((t) => t.lastUsedAt)
      .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())
      .slice(0, 5);

    return {
      total: templates.length,
      favorites: templates.filter((t) => t.isFavorite).length,
      byCategory,
      byTriggerType,
      mostUsed,
      recentlyUsed,
    };
  }
}
