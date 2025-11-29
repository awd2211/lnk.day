import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type LdapSecurityProtocol = 'none' | 'ssl' | 'starttls';

@Entity('ldap_configs')
export class LdapConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  teamId: string;

  @Column()
  name: string; // Display name for this LDAP connection

  // Connection settings
  @Column()
  host: string;

  @Column({ default: 389 })
  port: number;

  @Column({ type: 'varchar', default: 'none' })
  securityProtocol: LdapSecurityProtocol;

  @Column({ default: 10000 })
  connectionTimeout: number; // milliseconds

  // Bind credentials
  @Column()
  bindDn: string; // e.g., cn=admin,dc=example,dc=com

  @Column()
  bindPassword: string;

  // User search settings
  @Column()
  baseDn: string; // e.g., dc=example,dc=com

  @Column({ default: '(&(objectClass=person)(uid={{username}}))' })
  userSearchFilter: string;

  @Column({ default: 'sub' })
  searchScope: 'base' | 'one' | 'sub';

  // Attribute mappings
  @Column('jsonb', {
    default: {
      username: 'uid',
      email: 'mail',
      firstName: 'givenName',
      lastName: 'sn',
      displayName: 'displayName',
      memberOf: 'memberOf',
    },
  })
  attributeMapping: {
    [key: string]: string | undefined;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    memberOf?: string;
  };

  // Group settings
  @Column({ nullable: true })
  groupBaseDn?: string;

  @Column({ default: '(&(objectClass=group)(member={{userDn}}))' })
  groupSearchFilter: string;

  @Column('jsonb', { default: {} })
  groupMapping: {
    // Map LDAP groups to lnk.day roles
    // e.g., { "cn=admins,ou=groups,dc=example,dc=com": "admin" }
    [ldapGroup: string]: string;
  };

  // Auto-provisioning settings
  @Column({ default: true })
  autoProvisionUsers: boolean;

  @Column({ default: false })
  autoSyncGroups: boolean;

  @Column({ nullable: true })
  defaultRole?: string; // Default role for new users

  // Status
  @Column({ default: false })
  @Index()
  enabled: boolean;

  @Column({ nullable: true })
  lastTestAt?: Date;

  @Column({ nullable: true })
  lastTestResult?: string;

  @Column({ nullable: true })
  lastSyncAt?: Date;

  @Column({ default: 0 })
  syncedUsersCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
