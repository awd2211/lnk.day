import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageComment, CommentStatus, GuestbookSettings, DEFAULT_GUESTBOOK_SETTINGS } from './entities/comment.entity';
import { Page } from './entities/page.entity';

export interface CreateCommentDto {
  pageId: string;
  authorName: string;
  authorEmail?: string;
  authorWebsite?: string;
  content: string;
  parentId?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

export interface UpdateCommentDto {
  status?: CommentStatus;
  isPinned?: boolean;
  content?: string;
}

export interface CommentQueryDto {
  pageId: string;
  status?: CommentStatus;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'popular';
  parentId?: string | null;
}

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(PageComment)
    private readonly commentRepo: Repository<PageComment>,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
  ) {}

  async create(dto: CreateCommentDto): Promise<PageComment> {
    const page = await this.pageRepo.findOne({ where: { id: dto.pageId } });
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const settings = this.getGuestbookSettings(page);
    if (!settings.enabled) {
      throw new BadRequestException('Guestbook is disabled for this page');
    }

    // 验证内容长度
    if (dto.content.length > settings.maxLength) {
      throw new BadRequestException(`Content exceeds maximum length of ${settings.maxLength}`);
    }

    // 验证邮箱要求
    if (settings.requireEmail && !dto.authorEmail) {
      throw new BadRequestException('Email is required');
    }

    // 检查屏蔽词
    if (settings.blockedWords && settings.blockedWords.length > 0) {
      const contentLower = dto.content.toLowerCase();
      const hasBlockedWord = settings.blockedWords.some(word =>
        contentLower.includes(word.toLowerCase())
      );
      if (hasBlockedWord) {
        throw new BadRequestException('Comment contains blocked words');
      }
    }

    // 检查屏蔽 IP
    if (dto.ipAddress && settings.blockedIps?.includes(dto.ipAddress)) {
      throw new ForbiddenException('Your IP is blocked');
    }

    // 验证父评论
    if (dto.parentId) {
      if (!settings.allowReplies) {
        throw new BadRequestException('Replies are not allowed');
      }
      const parent = await this.commentRepo.findOne({ where: { id: dto.parentId } });
      if (!parent || parent.pageId !== dto.pageId) {
        throw new BadRequestException('Invalid parent comment');
      }
    }

    const comment = this.commentRepo.create({
      ...dto,
      status: settings.requireApproval ? CommentStatus.PENDING : CommentStatus.APPROVED,
      authorAvatar: dto.authorEmail ? this.generateGravatarUrl(dto.authorEmail) : undefined,
    });

    return this.commentRepo.save(comment);
  }

  async findByPage(query: CommentQueryDto): Promise<{ comments: PageComment[]; total: number }> {
    const {
      pageId,
      status = CommentStatus.APPROVED,
      page = 1,
      limit = 20,
      sortBy = 'newest',
      parentId,
    } = query;

    const qb = this.commentRepo.createQueryBuilder('comment')
      .where('comment.pageId = :pageId', { pageId })
      .andWhere('comment.status = :status', { status });

    if (parentId === null) {
      qb.andWhere('comment.parentId IS NULL');
    } else if (parentId) {
      qb.andWhere('comment.parentId = :parentId', { parentId });
    }

    switch (sortBy) {
      case 'oldest':
        qb.orderBy('comment.createdAt', 'ASC');
        break;
      case 'popular':
        qb.orderBy('comment.likes', 'DESC').addOrderBy('comment.createdAt', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('comment.isPinned', 'DESC').addOrderBy('comment.createdAt', 'DESC');
        break;
    }

    const [comments, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { comments, total };
  }

  async findOne(id: string): Promise<PageComment> {
    const comment = await this.commentRepo.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async update(id: string, dto: UpdateCommentDto): Promise<PageComment> {
    const comment = await this.findOne(id);
    Object.assign(comment, dto);
    return this.commentRepo.save(comment);
  }

  async delete(id: string): Promise<void> {
    const comment = await this.findOne(id);
    await this.commentRepo.remove(comment);
  }

  async approve(id: string): Promise<PageComment> {
    return this.update(id, { status: CommentStatus.APPROVED });
  }

  async reject(id: string): Promise<PageComment> {
    return this.update(id, { status: CommentStatus.REJECTED });
  }

  async markAsSpam(id: string): Promise<PageComment> {
    return this.update(id, { status: CommentStatus.SPAM });
  }

  async togglePin(id: string): Promise<PageComment> {
    const comment = await this.findOne(id);
    return this.update(id, { isPinned: !comment.isPinned });
  }

  async like(id: string): Promise<PageComment> {
    const comment = await this.findOne(id);
    comment.likes += 1;
    return this.commentRepo.save(comment);
  }

  async unlike(id: string): Promise<PageComment> {
    const comment = await this.findOne(id);
    comment.likes = Math.max(0, comment.likes - 1);
    return this.commentRepo.save(comment);
  }

  async getStats(pageId: string): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    spam: number;
  }> {
    const stats = await this.commentRepo
      .createQueryBuilder('comment')
      .select('comment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('comment.pageId = :pageId', { pageId })
      .groupBy('comment.status')
      .getRawMany();

    const result = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      spam: 0,
    };

    for (const stat of stats) {
      const count = parseInt(stat.count, 10);
      result.total += count;
      switch (stat.status) {
        case CommentStatus.APPROVED:
          result.approved = count;
          break;
        case CommentStatus.PENDING:
          result.pending = count;
          break;
        case CommentStatus.REJECTED:
          result.rejected = count;
          break;
        case CommentStatus.SPAM:
          result.spam = count;
          break;
      }
    }

    return result;
  }

  async bulkAction(
    ids: string[],
    action: 'approve' | 'reject' | 'spam' | 'delete',
  ): Promise<number> {
    if (action === 'delete') {
      const result = await this.commentRepo.delete(ids);
      return result.affected || 0;
    }

    const statusMap = {
      approve: CommentStatus.APPROVED,
      reject: CommentStatus.REJECTED,
      spam: CommentStatus.SPAM,
    };

    const result = await this.commentRepo.update(ids, { status: statusMap[action] });
    return result.affected || 0;
  }

  async getReplies(commentId: string): Promise<PageComment[]> {
    return this.commentRepo.find({
      where: { parentId: commentId, status: CommentStatus.APPROVED },
      order: { createdAt: 'ASC' },
    });
  }

  async ownerReply(
    commentId: string,
    pageId: string,
    content: string,
    ownerName: string,
  ): Promise<PageComment> {
    const parent = await this.findOne(commentId);
    if (parent.pageId !== pageId) {
      throw new BadRequestException('Comment does not belong to this page');
    }

    const reply = this.commentRepo.create({
      pageId,
      parentId: commentId,
      authorName: ownerName,
      content,
      status: CommentStatus.APPROVED,
      isOwnerReply: true,
    });

    return this.commentRepo.save(reply);
  }

  private getGuestbookSettings(page: Page): GuestbookSettings {
    const settings = (page.settings as any)?.guestbook;
    return { ...DEFAULT_GUESTBOOK_SETTINGS, ...settings };
  }

  private generateGravatarUrl(email: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=80`;
  }
}
