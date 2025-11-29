import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SSOProvider {
  SAML = 'saml',
  OIDC = 'oidc',
  LDAP = 'ldap',
}

export enum SSOStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Entity('sso_configs')
export class SSOConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ type: 'enum', enum: SSOProvider })
  provider: SSOProvider;

  @Column({ type: 'enum', enum: SSOStatus, default: SSOStatus.PENDING })
  @Index()
  status: SSOStatus;

  @Column({ nullable: true })
  displayName?: string;

  // SAML Configuration
  @Column({ nullable: true })
  samlEntityId?: string;

  @Column({ nullable: true })
  samlSsoUrl?: string;

  @Column({ nullable: true })
  samlSloUrl?: string;

  @Column({ type: 'text', nullable: true })
  samlCertificate?: string;

  @Column({ default: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' })
  samlNameIdFormat?: string;

  // OIDC Configuration
  @Column({ nullable: true })
  oidcIssuer?: string;

  @Column({ nullable: true })
  oidcClientId?: string;

  @Column({ nullable: true })
  oidcClientSecret?: string;

  @Column({ nullable: true })
  oidcAuthorizationUrl?: string;

  @Column({ nullable: true })
  oidcTokenUrl?: string;

  @Column({ nullable: true })
  oidcUserInfoUrl?: string;

  @Column('simple-array', { default: '' })
  oidcScopes: string[];

  // LDAP Configuration
  @Column({ nullable: true })
  ldapUrl?: string;

  @Column({ nullable: true })
  ldapBindDn?: string;

  @Column({ nullable: true })
  ldapBindPassword?: string;

  @Column({ nullable: true })
  ldapSearchBase?: string;

  @Column({ nullable: true })
  ldapSearchFilter?: string;

  @Column({ nullable: true })
  ldapUsernameAttribute?: string;

  @Column({ nullable: true })
  ldapEmailAttribute?: string;

  // Attribute Mapping
  @Column('jsonb', { default: {} })
  attributeMapping: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
  };

  // Settings
  @Column({ default: false })
  autoProvision: boolean;

  @Column({ default: false })
  enforceSSO: boolean;

  @Column('simple-array', { default: '' })
  allowedDomains: string[];

  @Column({ nullable: true })
  defaultRole?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('sso_sessions')
@Index(['userId', 'ssoConfigId'])
export class SSOSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  ssoConfigId: string;

  @Column()
  @Index()
  userId: string;

  @Column({ nullable: true })
  externalUserId?: string;

  @Column({ nullable: true })
  sessionIndex?: string;

  @Column({ type: 'timestamp with time zone' })
  authenticatedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @Index()
  expiresAt?: Date;

  @Column('jsonb', { nullable: true })
  attributes?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
