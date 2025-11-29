import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Page } from './page.entity';

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SPAM = 'spam',
}

@Entity('page_comments')
@Index(['pageId', 'status'])
@Index(['pageId', 'createdAt'])
export class PageComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  pageId: string;

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page: Page;

  @Column({ length: 100 })
  authorName: string;

  @Column({ length: 255, nullable: true })
  authorEmail?: string;

  @Column({ length: 500, nullable: true })
  authorWebsite?: string;

  @Column({ length: 255, nullable: true })
  authorAvatar?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: CommentStatus,
    default: CommentStatus.PENDING,
  })
  @Index()
  status: CommentStatus;

  @Column({ default: 0 })
  likes: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId?: string;

  @ManyToOne(() => PageComment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent?: PageComment;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isOwnerReply: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface GuestbookSettings {
  enabled: boolean;
  requireApproval: boolean;
  requireEmail: boolean;
  allowAnonymous: boolean;
  allowReplies: boolean;
  maxLength: number;
  placeholder?: string;
  title?: string;
  emptyMessage?: string;
  successMessage?: string;
  enableLikes: boolean;
  enableEmojis: boolean;
  sortOrder: 'newest' | 'oldest' | 'popular';
  displayCount: number;
  showAvatars: boolean;
  enableNotifications: boolean;
  notificationEmail?: string;
  blockedWords?: string[];
  blockedIps?: string[];
}

export const DEFAULT_GUESTBOOK_SETTINGS: GuestbookSettings = {
  enabled: false,
  requireApproval: true,
  requireEmail: false,
  allowAnonymous: true,
  allowReplies: true,
  maxLength: 500,
  placeholder: '写下你的留言...',
  title: '访客留言',
  emptyMessage: '还没有留言，来第一个留言吧！',
  successMessage: '感谢你的留言！',
  enableLikes: true,
  enableEmojis: true,
  sortOrder: 'newest',
  displayCount: 20,
  showAvatars: true,
  enableNotifications: false,
  blockedWords: [],
  blockedIps: [],
};
