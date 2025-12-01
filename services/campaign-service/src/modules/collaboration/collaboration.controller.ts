import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
  CurrentUser,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import { CollaborationService } from './collaboration.service';
import { CollaboratorRole, CommentType } from './collaboration.entity';

@ApiTags('campaign-collaboration')
@Controller('campaigns/:campaignId')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // Collaborators
  @Get('collaborators')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取活动协作者列表' })
  getCollaborators(@Param('campaignId') campaignId: string) {
    return this.collaborationService.getCollaborators(campaignId);
  }

  @Post('collaborators')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '添加协作者' })
  addCollaborator(
    @Param('campaignId') campaignId: string,
    @Body() body: { userId: string; role: CollaboratorRole },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.addCollaborator(
      campaignId,
      body.userId,
      body.role,
      user.sub,
    );
  }

  @Put('collaborators/:collaboratorId')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新协作者角色' })
  updateRole(
    @Param('campaignId') campaignId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Body() body: { role: CollaboratorRole },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.updateRoleById(campaignId, collaboratorId, body.role, user.sub);
  }

  @Patch('collaborators/:collaboratorId')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新协作者角色 (PATCH)' })
  updateRolePatch(
    @Param('campaignId') campaignId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Body() body: { role: CollaboratorRole },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.updateRoleById(campaignId, collaboratorId, body.role, user.sub);
  }

  @Delete('collaborators/:collaboratorId')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '移除协作者' })
  removeCollaborator(
    @Param('campaignId') campaignId: string,
    @Param('collaboratorId') collaboratorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.removeCollaboratorById(campaignId, collaboratorId, user.sub);
  }

  // Comments
  @Get('comments')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取活动评论' })
  getComments(@Param('campaignId') campaignId: string) {
    return this.collaborationService.getComments(campaignId);
  }

  @Post('comments')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.addComment(campaignId, user.sub, body.content, {
      type: body.type,
      mentionedUsers: body.mentionedUsers,
      attachments: body.attachments,
      parentId: body.parentId,
    });
  }

  @Put('comments/:commentId')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新评论' })
  updateComment(
    @Param('commentId') commentId: string,
    @Body() body: { content: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.updateComment(commentId, user.sub, body.content);
  }

  @Delete('comments/:commentId')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '删除评论' })
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.deleteComment(commentId, user.sub);
  }

  @Post('comments/:commentId/pin')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '置顶/取消置顶评论' })
  pinComment(
    @Param('commentId') commentId: string,
    @Body() body: { pinned: boolean },
  ) {
    return this.collaborationService.pinComment(commentId, body.pinned);
  }

  @Post('comments/:commentId/reactions')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '添加表情反应' })
  addReaction(
    @Param('commentId') commentId: string,
    @Body() body: { emoji: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.addReaction(commentId, body.emoji, {
      id: user.sub,
      name: user.name || user.email,
    });
  }

  @Delete('comments/:commentId/reactions/:emoji')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '移除表情反应' })
  removeReaction(
    @Param('commentId') commentId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.removeReaction(commentId, emoji, user.sub);
  }

  // Activity log
  @Get('activity')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取活动日志' })
  getActivityLog(
    @Param('campaignId') campaignId: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.getActivityLog(campaignId, limit ? parseInt(limit) : 50);
  }
}
