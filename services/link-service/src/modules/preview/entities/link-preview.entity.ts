import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('link_previews')
export class LinkPreview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  linkId: string;

  @Column()
  @Index()
  url: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  favicon?: string;

  @Column({ nullable: true })
  siteName?: string;

  @Column({ nullable: true })
  type?: string;

  @Column('jsonb', { default: {} })
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    imageWidth?: number;
    imageHeight?: number;
    url?: string;
    type?: string;
    siteName?: string;
    locale?: string;
  };

  @Column('jsonb', { default: {} })
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
  };

  @Column({ default: false })
  isFetched: boolean;

  @Column({ nullable: true })
  fetchError?: string;

  @Column({ nullable: true })
  lastFetchedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
