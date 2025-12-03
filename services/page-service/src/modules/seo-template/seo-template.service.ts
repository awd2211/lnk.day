import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeoTemplate } from './entities/seo-template.entity';
import { CreateSeoTemplateDto } from './dto/create-seo-template.dto';
import { UpdateSeoTemplateDto } from './dto/update-seo-template.dto';

@Injectable()
export class SeoTemplateService {
  constructor(
    @InjectRepository(SeoTemplate)
    private readonly seoTemplateRepo: Repository<SeoTemplate>,
  ) {}

  async create(
    teamId: string,
    userId: string,
    dto: CreateSeoTemplateDto,
  ): Promise<SeoTemplate> {
    const template = this.seoTemplateRepo.create({
      ...dto,
      teamId,
      createdBy: userId,
    });
    return this.seoTemplateRepo.save(template);
  }

  async findAll(
    teamId: string,
    options?: {
      category?: string;
      isFavorite?: boolean;
      search?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<{ data: SeoTemplate[]; total: number; page: number; limit: number }> {
    const page = Number(options?.page) || 1;
    const limit = Number(options?.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.seoTemplateRepo
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

    qb.orderBy('template.isFavorite', 'DESC')
      .addOrderBy('template.usageCount', 'DESC')
      .addOrderBy('template.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, teamId: string): Promise<SeoTemplate> {
    const template = await this.seoTemplateRepo.findOne({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException(`SEO template ${id} not found`);
    }

    return template;
  }

  async update(
    id: string,
    teamId: string,
    dto: UpdateSeoTemplateDto,
  ): Promise<SeoTemplate> {
    const template = await this.findOne(id, teamId);
    Object.assign(template, dto);
    return this.seoTemplateRepo.save(template);
  }

  async remove(id: string, teamId: string): Promise<void> {
    const template = await this.findOne(id, teamId);
    await this.seoTemplateRepo.remove(template);
  }

  async toggleFavorite(id: string, teamId: string): Promise<SeoTemplate> {
    const template = await this.findOne(id, teamId);
    template.isFavorite = !template.isFavorite;
    return this.seoTemplateRepo.save(template);
  }

  async incrementUsage(id: string, teamId: string): Promise<SeoTemplate> {
    const template = await this.findOne(id, teamId);
    template.usageCount += 1;
    template.lastUsedAt = new Date();
    return this.seoTemplateRepo.save(template);
  }

  async duplicate(id: string, teamId: string, userId: string): Promise<SeoTemplate> {
    const original = await this.findOne(id, teamId);

    // Exclude id and timestamps
    const { id: _, createdAt: __, updatedAt: ___, lastUsedAt: ____, ...rest } = original;

    const duplicate = this.seoTemplateRepo.create({
      ...rest,
      name: `${original.name} (Copy)`,
      createdBy: userId,
      isFavorite: false,
      usageCount: 0,
    });

    return this.seoTemplateRepo.save(duplicate);
  }

  async getStats(teamId: string): Promise<{
    total: number;
    favorites: number;
    byCategory: Record<string, number>;
    mostUsed: SeoTemplate[];
    recentlyUsed: SeoTemplate[];
  }> {
    const templates = await this.seoTemplateRepo.find({ where: { teamId } });

    const byCategory: Record<string, number> = {};
    templates.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
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
      mostUsed,
      recentlyUsed,
    };
  }
}
