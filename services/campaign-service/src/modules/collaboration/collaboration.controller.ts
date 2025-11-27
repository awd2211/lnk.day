import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CollaborationService } from './collaboration.service';
import { CollaboratorRole, CommentType } from './collaboration.entity';

@ApiTags('campaign-collaboration')
@Controller('campaigns/:campaignId')
@ApiBearerAuth()
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // Collaborators
  @Get('collaborators')
  @ApiOperation({ summary: '获取活动协作者列表' })
  getCollaborators(@Param('campaignId') campaignId: string) {
    return this.collaborationService.getCollaborators(campaignId);
  }

  @Post('collaborators')
  @ApiOperation({ summary: '添加协作者' })
  addCollaborator(
    @Param('campaignId') campaignId: string,
    @Body() body: { userId: string; role: CollaboratorRole },
    @Headers('x-user-id') invitedBy: string,
  ) {
    return this.collaborationService.addCollaborator(
      campaignId,
      body.userId,
      body.role,
      invitedBy,
    );
  }

  @Put('collaborators/:userId')
  @ApiOperation({ summary: '更新协作者角色' })
  updateRole(
    @Param('campaignId') campaignId: string,
    @Param('userId') userId: string,
    @Body() body: { role: CollaboratorRole },
    @Headers('x-user-id') updatedBy: string,
  ) {
    return this.collaborationService.updateRole(campaignId, userId, body.role, updatedBy);
  }

  @Delete('collaborators/:userId')
  @ApiOperation({ summary: '移除协作者' })
  removeCollaborator(
    @Param('campaignId') campaignId: string,
    @Param('userId') userId: string,
    @Headers('x-user-id') removedBy: string,
  ) {
    return this.collaborationService.removeCollaborator(campaignId, userId, removedBy);
  }

  // Comments
  @Get('comments')
  @ApiOperation({ summary: '获取活动评论' })
  getComments(@Param('campaignId') campaignId: string) {
    return this.collaborationService.getComments(campaignId);
  }

  @Post('comments')
  @ApiOperation({ summary: '添加评论' })
  addComment(
    @Param('campaignId') campaignId: string,
    @Body()
    body: {
      content: string;
      type?: CommentType;
      mentionedUsers?: string[];
      attachments?: any[];
      parentId?: string;
    },
    @Headers('x-user-id') userId: string,
  ) {
    return this.collaborationService.addComment(campaignId, userId, body.content, {
      type: body.type,
      mentionedUsers: body.mentionedUsers,
      attachments: body.attachments,
      parentId: body.parentId,
    });
  }

  @Put('comments/:commentId')
  @ApiOperation({ summary: '更新评论' })
  updateComment(
    @Param('commentId') commentId: string,
    @Body() body: { content: string },
    @Headers('x-user-id') userId: string,
  ) {
    return this.collaborationService.updateComment(commentId, userId, body.content);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: '删除评论' })
  deleteComment(
    @Param('commentId') commentId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.collaborationService.deleteComment(commentId, userId);
  }

  // Activity log
  @Get('activity')
  @ApiOperation({ summary: '获取活动日志' })
  getActivityLog(
    @Param('campaignId') campaignId: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.getActivityLog(campaignId, limit ? parseInt(limit) : 50);
  }
}
