import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookTemplate } from './entities/webhook-template.entity';
import { CreateWebhookTemplateDto } from './dto/create-webhook-template.dto';
import { UpdateWebhookTemplateDto } from './dto/update-webhook-template.dto';

@Injectable()
export class WebhookTemplateService {
  constructor(
    @InjectRepository(WebhookTemplate)
    private readonly templateRepository: Repository<WebhookTemplate>,
  ) {}

  async create(
    teamId: string,
    userId: string,
    dto: CreateWebhookTemplateDto,
  ): Promise<WebhookTemplate> {
    const template = this.templateRepository.create({
      ...dto,
      teamId,
      createdBy: userId,
    });

    return this.templateRepository.save(template);
  }

  async findAll(
    teamId: string,
    options?: {
      page?: number | string;
      limit?: number | string;
      isFavorite?: boolean;
      platform?: string;
      search?: string;
    },
  ): Promise<{ data: WebhookTemplate[]; total: number; page: number; limit: number }> {
    const { isFavorite, platform, search } = options || {};
    const page = Number(options?.page) || 1;
    const limit = Number(options?.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.templateRepository
      .createQueryBuilder('template')
      .where('template.teamId = :teamId', { teamId });

    if (isFavorite !== undefined) {
      qb.andWhere('template.isFavorite = :isFavorite', { isFavorite });
    }

    if (platform) {
      qb.andWhere('template.platform = :platform', { platform });
    }

    if (search) {
      qb.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('template.isFavorite', 'DESC')
      .addOrderBy('template.usageCount', 'DESC')
      .addOrderBy('template.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, teamId: string): Promise<WebhookTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException(`模板 ${id} 不存在`);
    }

    return template;
  }

  async update(
    id: string,
    teamId: string,
    dto: UpdateWebhookTemplateDto,
  ): Promise<WebhookTemplate> {
    const template = await this.findOne(id, teamId);

    Object.assign(template, dto);

    return this.templateRepository.save(template);
  }

  async remove(id: string, teamId: string): Promise<void> {
    const template = await this.findOne(id, teamId);
    await this.templateRepository.remove(template);
  }

  async toggleFavorite(id: string, teamId: string): Promise<WebhookTemplate> {
    const template = await this.findOne(id, teamId);
    template.isFavorite = !template.isFavorite;
    return this.templateRepository.save(template);
  }

  async incrementUsage(id: string, teamId: string): Promise<void> {
    await this.templateRepository.update(
      { id, teamId },
      {
        usageCount: () => 'usage_count + 1',
        lastUsedAt: new Date(),
      },
    );
  }

  async duplicate(
    id: string,
    teamId: string,
    userId: string,
    newName?: string,
  ): Promise<WebhookTemplate> {
    const original = await this.findOne(id, teamId);

    const { id: _, createdAt: __, updatedAt: ___, lastUsedAt: ____, ...rest } = original;

    const duplicate = this.templateRepository.create({
      ...rest,
      name: newName || `${original.name} (副本)`,
      createdBy: userId,
      isFavorite: false,
      usageCount: 0,
    });

    return this.templateRepository.save(duplicate);
  }
}
