import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CollaboratorRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum CommentType {
  COMMENT = 'comment',
  MENTION = 'mention',
  STATUS_CHANGE = 'status_change',
  LINK_ADDED = 'link_added',
}

@Entity('campaign_collaborators')
@Index(['campaignId', 'userId'], { unique: true })
@Index(['campaignId', 'role'])
export class CampaignCollaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  campaignId: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: CollaboratorRole, default: CollaboratorRole.VIEWER })
  role: CollaboratorRole;

  @Column('simple-array', { default: '' })
  permissions: string[];

  @Column({ nullable: true })
  invitedBy?: string;

  @Column({ nullable: true })
  acceptedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('campaign_comments')
@Index(['campaignId', 'createdAt'])
export class CampaignComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  campaignId: string;

  @Column()
  @Index()
  userId: string;

  @Column('text')
  content: string;

  @Column({ type: 'enum', enum: CommentType, default: CommentType.COMMENT })
  type: CommentType;

  @Column('simple-array', { default: '' })
  mentionedUsers: string[];

  @Column('jsonb', { nullable: true })
  attachments?: Array<{
    type: 'link' | 'image' | 'file';
    linkId?: string;
    url?: string;
    name?: string;
  }>;

  @Column({ nullable: true })
  @Index()
  parentId?: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ default: false })
  isPinned: boolean;

  @Column('jsonb', { nullable: true, default: [] })
  reactions?: Array<{
    emoji: string;
    users: Array<{ id: string; name: string }>;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('campaign_activity_log')
@Index(['campaignId', 'createdAt'])
export class CampaignActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  campaignId: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  action: string;

  @Column('jsonb', { nullable: true })
  details?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;
}
