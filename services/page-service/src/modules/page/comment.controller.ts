import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CommentService, CreateCommentDto, UpdateCommentDto, CommentQueryDto } from './comment.service';
import { CommentStatus } from './entities/comment.entity';

@ApiTags('comments')
@Controller('pages/:pageId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: '创建留言' })
  async create(
    @Param('pageId') pageId: string,
    @Body() body: Omit<CreateCommentDto, 'pageId' | 'ipAddress' | 'userAgent'>,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('cf-ipcountry') country?: string,
    @Headers('cf-ipcity') city?: string,
  ) {
    return this.commentService.create({
      ...body,
      pageId,
      ipAddress: ip,
      userAgent,
      country,
      city,
    });
  }

  @Get()
  @ApiOperation({ summary: '获取留言列表' })
  @ApiQuery({ name: 'status', required: false, enum: CommentStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'popular'] })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  async findByPage(
    @Param('pageId') pageId: string,
    @Query('status') status?: CommentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'newest' | 'oldest' | 'popular',
    @Query('parentId') parentId?: string,
  ) {
    return this.commentService.findByPage({
      pageId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      parentId: parentId === 'null' ? null : parentId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取留言统计' })
  async getStats(@Param('pageId') pageId: string) {
    return this.commentService.getStats(pageId);
  }

  @Get(':commentId')
  @ApiOperation({ summary: '获取单条留言' })
  async findOne(@Param('commentId') commentId: string) {
    return this.commentService.findOne(commentId);
  }

  @Get(':commentId/replies')
  @ApiOperation({ summary: '获取留言回复' })
  async getReplies(@Param('commentId') commentId: string) {
    return this.commentService.getReplies(commentId);
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

  @Post(':commentId/like')
  @ApiOperation({ summary: '点赞留言' })
  async like(@Param('commentId') commentId: string) {
    return this.commentService.like(commentId);
  }

  @Post(':commentId/unlike')
  @ApiOperation({ summary: '取消点赞' })
  async unlike(@Param('commentId') commentId: string) {
    return this.commentService.unlike(commentId);
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
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() body: { content: string; ownerName: string },
  ) {
    return this.commentService.ownerReply(commentId, pageId, body.content, body.ownerName);
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
