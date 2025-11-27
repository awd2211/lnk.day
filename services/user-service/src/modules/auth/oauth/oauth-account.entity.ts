import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
  WECHAT = 'wechat',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
}

@Entity('oauth_accounts')
@Unique(['provider', 'providerAccountId'])
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: OAuthProvider })
  provider: OAuthProvider;

  @Column()
  @Index()
  providerAccountId: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true, type: 'text' })
  accessToken?: string;

  @Column({ nullable: true, type: 'text' })
  refreshToken?: string;

  @Column({ nullable: true })
  tokenExpiresAt?: Date;

  @Column('jsonb', { nullable: true })
  profile?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
