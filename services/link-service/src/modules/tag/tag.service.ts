import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Tag, TagGroup } from './entities/tag.entity';

interface CreateTagDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  groupId?: string;
  autoApplyRules?: Array<{
    type: 'url_pattern' | 'utm_source' | 'utm_campaign' | 'domain';
    value: string;
  }>;
}

interface CreateTagGroupDto {
  name: string;
  description?: string;
  color?: string;
  isExclusive?: boolean;
}

interface TagWithStats extends Tag {
  linkCount: number;
}

// 预定义颜色
const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#78716C', '#64748B', '#6B7280',
];

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(TagGroup)
    private readonly tagGroupRepository: Repository<TagGroup>,
  ) {}

  // ==================== Tag CRUD ====================

  async createTag(dto: CreateTagDto, teamId: string): Promise<Tag> {
    // 检查重复
    const existing = await this.tagRepository.findOne({
      where: { teamId, name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Tag "${dto.name}" already exists`);
    }

    // 自动分配颜色
    const color = dto.color || this.getNextColor(teamId);

    const tag = this.tagRepository.create({
      ...dto,
      teamId,
      color,
      metadata: {
        autoApplyRules: dto.autoApplyRules || [],
      },
    });

    return this.tagRepository.save(tag);
  }

  async findAllTags(
    teamId: string,
    options?: {
      search?: string;
      groupId?: string;
      parentId?: string;
      includeStats?: boolean;
    },
  ): Promise<Tag[]> {
    let query = this.tagRepository
      .createQueryBuilder('tag')
      .where('tag.teamId = :teamId', { teamId })
      .orderBy('tag.order', 'ASC')
      .addOrderBy('tag.name', 'ASC');

    if (options?.search) {
      query = query.andWhere('tag.name ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    if (options?.parentId) {
      query = query.andWhere('tag.parentId = :parentId', {
        parentId: options.parentId,
      });
    }

    return query.getMany();
  }

  async findTagById(id: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }
    return tag;
  }

  async findOrCreateTag(name: string, teamId: string): Promise<Tag> {
    const existing = await this.tagRepository.findOne({
      where: { teamId, name },
    });
    if (existing) {
      return existing;
    }

    return this.createTag({ name }, teamId);
  }

  async updateTag(
    id: string,
    dto: Partial<CreateTagDto>,
  ): Promise<Tag> {
    const tag = await this.findTagById(id);

    if (dto.autoApplyRules) {
      tag.metadata = { ...tag.metadata, autoApplyRules: dto.autoApplyRules };
    }

    Object.assign(tag, {
      name: dto.name ?? tag.name,
      description: dto.description ?? tag.description,
      color: dto.color ?? tag.color,
      icon: dto.icon ?? tag.icon,
      parentId: dto.parentId ?? tag.parentId,
    });

    return this.tagRepository.save(tag);
  }

  async deleteTag(id: string): Promise<void> {
    const tag = await this.findTagById(id);
    await this.tagRepository.remove(tag);
  }

  async mergeTags(
    sourceTagIds: string[],
    targetTagId: string,
    teamId: string,
  ): Promise<Tag> {
    const targetTag = await this.findTagById(targetTagId);
    if (targetTag.teamId !== teamId) {
      throw new BadRequestException('Target tag does not belong to this team');
    }

    const sourceTags = await this.tagRepository.find({
      where: { id: In(sourceTagIds), teamId },
    });

    // 合并使用计数
    const totalUsage = sourceTags.reduce((sum, t) => sum + t.usageCount, 0);
    targetTag.usageCount += totalUsage;

    // 删除源标签
    await this.tagRepository.remove(sourceTags);

    return this.tagRepository.save(targetTag);
  }

  async reorderTags(
    teamId: string,
    tagOrders: Array<{ id: string; order: number }>,
  ): Promise<void> {
    for (const item of tagOrders) {
      await this.tagRepository.update(
        { id: item.id, teamId },
        { order: item.order },
      );
    }
  }

  async incrementUsage(tagNames: string[], teamId: string): Promise<void> {
    if (!tagNames.length) return;

    await this.tagRepository
      .createQueryBuilder()
      .update(Tag)
      .set({ usageCount: () => 'usage_count + 1' })
      .where('team_id = :teamId', { teamId })
      .andWhere('name IN (:...names)', { names: tagNames })
      .execute();
  }

  async decrementUsage(tagNames: string[], teamId: string): Promise<void> {
    if (!tagNames.length) return;

    await this.tagRepository
      .createQueryBuilder()
      .update(Tag)
      .set({ usageCount: () => 'GREATEST(usage_count - 1, 0)' })
      .where('team_id = :teamId', { teamId })
      .andWhere('name IN (:...names)', { names: tagNames })
      .execute();
  }

  // ==================== Tag Groups ====================

  async createTagGroup(
    dto: CreateTagGroupDto,
    teamId: string,
  ): Promise<TagGroup> {
    const existing = await this.tagGroupRepository.findOne({
      where: { teamId, name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Tag group "${dto.name}" already exists`);
    }

    const group = this.tagGroupRepository.create({
      ...dto,
      teamId,
    });

    return this.tagGroupRepository.save(group);
  }

  async findAllTagGroups(teamId: string): Promise<TagGroup[]> {
    return this.tagGroupRepository.find({
      where: { teamId },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findTagGroupById(id: string): Promise<TagGroup> {
    const group = await this.tagGroupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`Tag group with ID ${id} not found`);
    }
    return group;
  }

  async updateTagGroup(
    id: string,
    dto: Partial<CreateTagGroupDto>,
  ): Promise<TagGroup> {
    const group = await this.findTagGroupById(id);
    Object.assign(group, dto);
    return this.tagGroupRepository.save(group);
  }

  async deleteTagGroup(id: string): Promise<void> {
    const group = await this.findTagGroupById(id);

    // 移除该组下所有标签的 parentId
    await this.tagRepository.update(
      { parentId: id },
      { parentId: undefined as any },
    );

    await this.tagGroupRepository.remove(group);
  }

  async getTagsInGroup(groupId: string): Promise<Tag[]> {
    return this.tagRepository.find({
      where: { parentId: groupId },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async addTagToGroup(tagId: string, groupId: string): Promise<Tag> {
    const tag = await this.findTagById(tagId);
    const group = await this.findTagGroupById(groupId);

    if (tag.teamId !== group.teamId) {
      throw new BadRequestException('Tag and group must belong to same team');
    }

    tag.parentId = groupId;
    return this.tagRepository.save(tag);
  }

  async removeTagFromGroup(tagId: string): Promise<Tag> {
    const tag = await this.findTagById(tagId);
    tag.parentId = undefined;
    return this.tagRepository.save(tag);
  }

  // ==================== Auto-apply rules ====================

  async getAutoApplyTags(
    teamId: string,
    context: {
      url?: string;
      utmSource?: string;
      utmCampaign?: string;
      domain?: string;
    },
  ): Promise<string[]> {
    const tags = await this.tagRepository.find({ where: { teamId } });
    const matchedTags: string[] = [];

    for (const tag of tags) {
      const rules = tag.metadata?.autoApplyRules || [];
      for (const rule of rules) {
        let matches = false;

        switch (rule.type) {
          case 'url_pattern':
            if (context.url && context.url.includes(rule.value)) {
              matches = true;
            }
            break;
          case 'utm_source':
            if (context.utmSource === rule.value) {
              matches = true;
            }
            break;
          case 'utm_campaign':
            if (context.utmCampaign === rule.value) {
              matches = true;
            }
            break;
          case 'domain':
            if (context.domain && context.domain.includes(rule.value)) {
              matches = true;
            }
            break;
        }

        if (matches) {
          matchedTags.push(tag.name);
          break;
        }
      }
    }

    return [...new Set(matchedTags)];
  }

  // ==================== Stats & Analytics ====================

  async getTagStats(teamId: string): Promise<{
    totalTags: number;
    totalGroups: number;
    topTags: Array<{ name: string; usageCount: number; color?: string }>;
    unusedTags: number;
    tagsByGroup: Array<{ groupName: string; tagCount: number }>;
  }> {
    const tags = await this.tagRepository.find({ where: { teamId } });
    const groups = await this.tagGroupRepository.find({ where: { teamId } });

    const topTags = [...tags]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map((t) => ({ name: t.name, usageCount: t.usageCount, color: t.color }));

    const unusedTags = tags.filter((t) => t.usageCount === 0).length;

    const tagsByGroup = groups.map((g) => ({
      groupName: g.name,
      tagCount: tags.filter((t) => t.parentId === g.id).length,
    }));

    return {
      totalTags: tags.length,
      totalGroups: groups.length,
      topTags,
      unusedTags,
      tagsByGroup,
    };
  }

  async getSuggestedTags(
    teamId: string,
    url: string,
    limit: number = 5,
  ): Promise<string[]> {
    // 基于 URL 提取可能的标签
    const suggestions: string[] = [];

    try {
      const urlObj = new URL(url);

      // 从域名提取
      const domain = urlObj.hostname.replace('www.', '');
      suggestions.push(domain.split('.')[0] || '');

      // 从路径提取
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      suggestions.push(...pathParts.slice(0, 2));

      // 从 UTM 参数提取
      const utmSource = urlObj.searchParams.get('utm_source');
      const utmCampaign = urlObj.searchParams.get('utm_campaign');
      if (utmSource) suggestions.push(utmSource);
      if (utmCampaign) suggestions.push(utmCampaign);
    } catch {
      // URL 解析失败，忽略
    }

    // 过滤并获取已存在的相关标签
    const existingTags = await this.tagRepository.find({
      where: { teamId },
      order: { usageCount: 'DESC' },
      take: 20,
    });

    const existingNames = new Set(existingTags.map((t) => t.name.toLowerCase()));
    const filtered = suggestions
      .filter((s) => s.length >= 2)
      .map((s) => s.toLowerCase())
      .filter((s) => existingNames.has(s));

    // 添加最常用的标签作为补充
    const popularTags = existingTags
      .slice(0, limit)
      .map((t) => t.name);

    return [...new Set([...filtered, ...popularTags])].slice(0, limit);
  }

  // ==================== Helpers ====================

  private async getNextColor(teamId: string): Promise<string> {
    const count = await this.tagRepository.count({ where: { teamId } });
    return TAG_COLORS[count % TAG_COLORS.length] || TAG_COLORS[0];
  }

  getAvailableColors(): string[] {
    return TAG_COLORS;
  }

  // 批量创建标签
  async bulkCreateTags(
    names: string[],
    teamId: string,
  ): Promise<Tag[]> {
    const uniqueNames = [...new Set(names)];
    const results: Tag[] = [];

    for (const name of uniqueNames) {
      try {
        const tag = await this.findOrCreateTag(name, teamId);
        results.push(tag);
      } catch (error) {
        this.logger.warn(`Failed to create tag "${name}": ${error}`);
      }
    }

    return results;
  }

  // 导出标签
  async exportTags(
    teamId: string,
  ): Promise<Array<{ name: string; color?: string; group?: string; usageCount: number }>> {
    const tags = await this.tagRepository.find({ where: { teamId } });
    const groups = await this.tagGroupRepository.find({ where: { teamId } });
    const groupMap = new Map(groups.map((g) => [g.id, g.name]));

    return tags.map((t) => ({
      name: t.name,
      color: t.color,
      group: t.parentId ? groupMap.get(t.parentId) : undefined,
      usageCount: t.usageCount,
    }));
  }
}
