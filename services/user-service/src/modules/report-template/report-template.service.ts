import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTemplate, ReportCategory } from './entities/report-template.entity';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';

@Injectable()
export class ReportTemplateService {
  constructor(
    @InjectRepository(ReportTemplate)
    private readonly reportTemplateRepo: Repository<ReportTemplate>,
  ) {}

  async create(
    teamId: string,
    userId: string,
    dto: CreateReportTemplateDto,
  ): Promise<ReportTemplate> {
    const template = this.reportTemplateRepo.create({
      ...dto,
      dateRange: dto.dateRange as ReportTemplate['dateRange'],
      schedule: dto.schedule as ReportTemplate['schedule'],
      teamId,
      createdBy: userId,
    });
    return this.reportTemplateRepo.save(template);
  }

  async findAll(
    teamId: string,
    options?: {
      category?: ReportCategory;
      isFavorite?: boolean;
      search?: string;
      page?: number | string;
      limit?: number | string;
    },
  ): Promise<{ data: ReportTemplate[]; total: number; page: number; limit: number }> {
    const page = Number(options?.page) || 1;
    const limit = Number(options?.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.reportTemplateRepo
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

  async findOne(id: string, teamId: string): Promise<ReportTemplate> {
    const template = await this.reportTemplateRepo.findOne({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException(`Report template ${id} not found`);
    }

    return template;
  }

  async update(
    id: string,
    teamId: string,
    dto: UpdateReportTemplateDto,
  ): Promise<ReportTemplate> {
    const template = await this.findOne(id, teamId);

    const updateData = {
      ...dto,
      dateRange: dto.dateRange ? dto.dateRange as ReportTemplate['dateRange'] : template.dateRange,
      schedule: dto.schedule ? dto.schedule as ReportTemplate['schedule'] : template.schedule,
    };

    Object.assign(template, updateData);
    return this.reportTemplateRepo.save(template);
  }

  async remove(id: string, teamId: string): Promise<void> {
    const template = await this.findOne(id, teamId);
    await this.reportTemplateRepo.remove(template);
  }

  async toggleFavorite(id: string, teamId: string): Promise<ReportTemplate> {
    const template = await this.findOne(id, teamId);
    template.isFavorite = !template.isFavorite;
    return this.reportTemplateRepo.save(template);
  }

  async incrementUsage(id: string, teamId: string): Promise<ReportTemplate> {
    const template = await this.findOne(id, teamId);
    template.usageCount += 1;
    template.lastUsedAt = new Date();
    return this.reportTemplateRepo.save(template);
  }

  async markGenerated(id: string, teamId: string): Promise<ReportTemplate> {
    const template = await this.findOne(id, teamId);
    template.lastGeneratedAt = new Date();
    return this.reportTemplateRepo.save(template);
  }

  async duplicate(id: string, teamId: string, userId: string): Promise<ReportTemplate> {
    const original = await this.findOne(id, teamId);

    // Exclude id and timestamps
    const { id: _, createdAt: __, updatedAt: ___, lastUsedAt: ____, lastGeneratedAt: _____, ...rest } = original;

    const duplicate = this.reportTemplateRepo.create({
      ...rest,
      name: `${original.name} (Copy)`,
      createdBy: userId,
      isFavorite: false,
      usageCount: 0,
    });

    return this.reportTemplateRepo.save(duplicate);
  }

  async getStats(teamId: string): Promise<{
    total: number;
    favorites: number;
    byCategory: Record<string, number>;
    byFormat: Record<string, number>;
    scheduled: number;
    mostUsed: ReportTemplate[];
    recentlyGenerated: ReportTemplate[];
  }> {
    const templates = await this.reportTemplateRepo.find({ where: { teamId } });

    const byCategory: Record<string, number> = {};
    const byFormat: Record<string, number> = {};

    templates.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byFormat[t.format] = (byFormat[t.format] || 0) + 1;
    });

    const mostUsed = [...templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    const recentlyGenerated = [...templates]
      .filter((t) => t.lastGeneratedAt)
      .sort((a, b) => new Date(b.lastGeneratedAt!).getTime() - new Date(a.lastGeneratedAt!).getTime())
      .slice(0, 5);

    return {
      total: templates.length,
      favorites: templates.filter((t) => t.isFavorite).length,
      byCategory,
      byFormat,
      scheduled: templates.filter((t) => t.schedule?.enabled).length,
      mostUsed,
      recentlyGenerated,
    };
  }

  async getScheduledReports(teamId: string): Promise<ReportTemplate[]> {
    return this.reportTemplateRepo.find({
      where: { teamId },
    }).then(templates => templates.filter(t => t.schedule?.enabled));
  }
}
