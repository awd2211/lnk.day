import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CommentService, UpdateCommentDto } from './comment.service';
import { CommentStatus } from './entities/comment.entity';
import {
  JwtAuthGuard,
  ScopeGuard,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PageComment } from './entities/comment.entity';
import { Page } from './entities/page.entity';

@ApiTags('comment-management')
@Controller('comments')
@UseGuards(JwtAuthGuard, ScopeGuard)
@ApiBearerAuth()
export class CommentManagementController {
  constructor(
    private readonly commentService: CommentService,
    @InjectRepository(PageComment)
    private readonly commentRepo: Repository<PageComment>,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取团队所有页面的留言' })
  @ApiQuery({ name: 'status', required: false, enum: CommentStatus })
  @ApiQuery({ name: 'pageId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('status') status?: CommentStatus | 'all',
    @Query('pageId') pageId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    // 获取团队所有页面
    const teamPages = await this.pageRepo.find({
      where: { teamId },
      select: ['id', 'name'],
    });
    const teamPageIds = teamPages.map(p => p.id);

    if (teamPageIds.length === 0) {
      return { comments: [], total: 0, pages: [] };
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const qb = this.commentRepo.createQueryBuilder('comment')
      .where('comment.pageId IN (:...pageIds)', { pageIds: teamPageIds })
      .leftJoinAndSelect('comment.page', 'page');

    // 过滤状态
    if (status && status !== 'all') {
      qb.andWhere('comment.status = :status', { status });
    }

    // 过滤页面
    if (pageId && pageId !== 'all') {
      qb.andWhere('comment.pageId = :pageId', { pageId });
    }

    // 搜索
    if (search) {
      qb.andWhere(
        '(comment.content ILIKE :search OR comment.authorName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 排序：置顶优先，然后按时间倒序
    qb.orderBy('comment.isPinned', 'DESC')
      .addOrderBy('comment.createdAt', 'DESC');

    const [comments, total] = await qb
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    // 格式化返回数据
    const formattedComments = comments.map(c => ({
      id: c.id,
      pageId: c.pageId,
      pageName: c.page?.name || 'Unknown Page',
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      authorWebsite: c.authorWebsite,
      authorAvatar: c.authorAvatar,
      content: c.content,
      status: c.status,
      likes: c.likes,
      ipAddress: c.ipAddress,
      country: c.country,
      city: c.city,
      parentId: c.parentId,
      isPinned: c.isPinned,
      isOwnerReply: c.isOwnerReply,
      createdAt: c.createdAt,
    }));

    // 获取回复
    const commentIds = comments.filter(c => !c.parentId).map(c => c.id);
    if (commentIds.length > 0) {
      const replies = await this.commentRepo.find({
        where: { parentId: In(commentIds) },
        order: { createdAt: 'ASC' },
      });

      const repliesMap = new Map<string, any[]>();
      for (const reply of replies) {
        if (!repliesMap.has(reply.parentId!)) {
          repliesMap.set(reply.parentId!, []);
        }
        repliesMap.get(reply.parentId!)!.push({
          id: reply.id,
          authorName: reply.authorName,
          content: reply.content,
          status: reply.status,
          likes: reply.likes,
          isPinned: reply.isPinned,
          isOwnerReply: reply.isOwnerReply,
          createdAt: reply.createdAt,
        });
      }

      for (const comment of formattedComments) {
        (comment as any).replies = repliesMap.get(comment.id) || [];
      }
    }

    return {
      comments: formattedComments,
      total,
      pages: teamPages.map(p => ({ id: p.id, name: p.name })),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: '获取团队留言统计' })
  async getStats(@ScopedTeamId() teamId: string) {
    const teamPages = await this.pageRepo.find({
      where: { teamId },
      select: ['id'],
    });
    const teamPageIds = teamPages.map(p => p.id);

    if (teamPageIds.length === 0) {
      return { total: 0, pending: 0, approved: 0, rejected: 0, spam: 0 };
    }

    const stats = await this.commentRepo
      .createQueryBuilder('comment')
      .select('comment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('comment.pageId IN (:...pageIds)', { pageIds: teamPageIds })
      .groupBy('comment.status')
      .getRawMany();

    const result = {
      total: 0,
      pending: 0,
      approved: 0,
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

  @Get(':commentId')
  @ApiOperation({ summary: '获取单条留言详情' })
  async findOne(@Param('commentId') commentId: string) {
    return this.commentService.findOne(commentId);
  }

  @Put(':commentId')
  @ApiOperation({ summary: '更新留言' })
  async update(
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentDto,
  ) {
    return this.commentService.update(commentId, body);
  }

  @Delete(':commentId')
  @ApiOperation({ summary: '删除留言' })
  async delete(@Param('commentId') commentId: string) {
    await this.commentService.delete(commentId);
    return { success: true };
  }

  @Post(':commentId/approve')
  @ApiOperation({ summary: '审批通过留言' })
  async approve(@Param('commentId') commentId: string) {
    return this.commentService.approve(commentId);
  }

  @Post(':commentId/reject')
  @ApiOperation({ summary: '拒绝留言' })
  async reject(@Param('commentId') commentId: string) {
    return this.commentService.reject(commentId);
  }

  @Post(':commentId/spam')
  @ApiOperation({ summary: '标记为垃圾' })
  async markAsSpam(@Param('commentId') commentId: string) {
    return this.commentService.markAsSpam(commentId);
  }

  @Post(':commentId/pin')
  @ApiOperation({ summary: '置顶/取消置顶' })
  async togglePin(@Param('commentId') commentId: string) {
    return this.commentService.togglePin(commentId);
  }

  @Post(':commentId/reply')
  @ApiOperation({ summary: '页面拥有者回复' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        ownerName: { type: 'string' },
      },
    },
  })
  async ownerReply(
    @Param('commentId') commentId: string,
    @Body() body: { content: string; ownerName: string },
  ) {
    const comment = await this.commentService.findOne(commentId);
    return this.commentService.ownerReply(
      commentId,
      comment.pageId,
      body.content,
      body.ownerName,
    );
  }

  @Post('bulk')
  @ApiOperation({ summary: '批量操作留言' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
        action: { type: 'string', enum: ['approve', 'reject', 'spam', 'delete'] },
      },
    },
  })
  async bulkAction(
    @Body() body: { ids: string[]; action: 'approve' | 'reject' | 'spam' | 'delete' },
  ) {
    const affected = await this.commentService.bulkAction(body.ids, body.action);
    return { success: true, affected };
  }
}
