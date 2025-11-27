import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CampaignCollaborator,
  CampaignComment,
  CampaignActivityLog,
  CollaboratorRole,
  CommentType,
} from './collaboration.entity';

const ROLE_PERMISSIONS: Record<CollaboratorRole, string[]> = {
  [CollaboratorRole.OWNER]: ['*'],
  [CollaboratorRole.EDITOR]: ['read', 'create_links', 'edit_links', 'view_analytics', 'comment'],
  [CollaboratorRole.VIEWER]: ['read', 'view_analytics', 'comment'],
};

@Injectable()
export class CollaborationService {
  constructor(
    @InjectRepository(CampaignCollaborator)
    private readonly collaboratorRepository: Repository<CampaignCollaborator>,
    @InjectRepository(CampaignComment)
    private readonly commentRepository: Repository<CampaignComment>,
    @InjectRepository(CampaignActivityLog)
    private readonly activityRepository: Repository<CampaignActivityLog>,
  ) {}

  // Collaborator management
  async addCollaborator(
    campaignId: string,
    userId: string,
    role: CollaboratorRole,
    invitedBy: string,
  ): Promise<CampaignCollaborator> {
    const existing = await this.collaboratorRepository.findOne({
      where: { campaignId, userId },
    });

    if (existing) {
      existing.role = role;
      existing.permissions = ROLE_PERMISSIONS[role];
      return this.collaboratorRepository.save(existing);
    }

    const collaborator = this.collaboratorRepository.create({
      campaignId,
      userId,
      role,
      permissions: ROLE_PERMISSIONS[role],
      invitedBy,
    });

    await this.logActivity(campaignId, invitedBy, 'collaborator_added', {
      userId,
      role,
    });

    return this.collaboratorRepository.save(collaborator);
  }

  async getCollaborators(campaignId: string): Promise<CampaignCollaborator[]> {
    return this.collaboratorRepository.find({
      where: { campaignId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateRole(
    campaignId: string,
    userId: string,
    role: CollaboratorRole,
    updatedBy: string,
  ): Promise<CampaignCollaborator> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { campaignId, userId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    collaborator.role = role;
    collaborator.permissions = ROLE_PERMISSIONS[role];

    await this.logActivity(campaignId, updatedBy, 'role_changed', {
      userId,
      newRole: role,
    });

    return this.collaboratorRepository.save(collaborator);
  }

  async removeCollaborator(campaignId: string, userId: string, removedBy: string): Promise<void> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { campaignId, userId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    await this.logActivity(campaignId, removedBy, 'collaborator_removed', { userId });
    await this.collaboratorRepository.remove(collaborator);
  }

  async checkPermission(campaignId: string, userId: string, permission: string): Promise<boolean> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { campaignId, userId },
    });

    if (!collaborator) return false;

    return collaborator.permissions.includes('*') || collaborator.permissions.includes(permission);
  }

  // Comments
  async addComment(
    campaignId: string,
    userId: string,
    content: string,
    options?: {
      type?: CommentType;
      mentionedUsers?: string[];
      attachments?: any[];
      parentId?: string;
    },
  ): Promise<CampaignComment> {
    const comment = this.commentRepository.create({
      campaignId,
      userId,
      content,
      type: options?.type || CommentType.COMMENT,
      mentionedUsers: options?.mentionedUsers || [],
      attachments: options?.attachments,
      parentId: options?.parentId,
    });

    const saved = await this.commentRepository.save(comment);

    await this.logActivity(campaignId, userId, 'comment_added', {
      commentId: saved.id,
      mentionedUsers: options?.mentionedUsers,
    });

    return saved;
  }

  async getComments(campaignId: string): Promise<CampaignComment[]> {
    return this.commentRepository.find({
      where: { campaignId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateComment(commentId: string, userId: string, content: string): Promise<CampaignComment> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = content;
    comment.isEdited = true;

    return this.commentRepository.save(comment);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.remove(comment);
  }

  // Activity log
  async logActivity(
    campaignId: string,
    userId: string,
    action: string,
    details?: Record<string, any>,
    ipAddress?: string,
  ): Promise<CampaignActivityLog> {
    const log = this.activityRepository.create({
      campaignId,
      userId,
      action,
      details,
      ipAddress,
    });

    return this.activityRepository.save(log);
  }

  async getActivityLog(campaignId: string, limit: number = 50): Promise<CampaignActivityLog[]> {
    return this.activityRepository.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
