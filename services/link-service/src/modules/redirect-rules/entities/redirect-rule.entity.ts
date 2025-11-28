import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum RuleType {
  GEO = 'geo',
  DEVICE = 'device',
  TIME = 'time',
  LANGUAGE = 'language',
  REFERRER = 'referrer',
  QUERY_PARAM = 'query_param',
}

export enum RuleOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN = 'in',
  NOT_IN = 'not_in',
  REGEX = 'regex',
}

export interface GeoCondition {
  countries?: string[];      // ISO 3166-1 alpha-2 codes
  regions?: string[];        // Region/State codes
  cities?: string[];         // City names
  continents?: string[];     // AF, AN, AS, EU, NA, OC, SA
  excludeCountries?: string[];
  excludeRegions?: string[];
}

export interface DeviceCondition {
  deviceTypes?: ('desktop' | 'mobile' | 'tablet')[];
  operatingSystems?: string[];  // iOS, Android, Windows, macOS, Linux
  browsers?: string[];          // Chrome, Safari, Firefox, Edge
  minOsVersion?: string;
  maxOsVersion?: string;
}

export interface TimeCondition {
  startDate?: string;        // YYYY-MM-DD
  endDate?: string;          // YYYY-MM-DD
  startTime?: string;        // HH:mm
  endTime?: string;          // HH:mm
  daysOfWeek?: number[];     // 0-6 (Sunday-Saturday)
  timezone?: string;         // IANA timezone (e.g., 'Asia/Shanghai')
}

export interface LanguageCondition {
  languages?: string[];      // ISO 639-1 codes (en, zh, ja, etc.)
  excludeLanguages?: string[];
}

export interface ReferrerCondition {
  domains?: string[];
  excludeDomains?: string[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface QueryParamCondition {
  paramName: string;
  operator: RuleOperator;
  value: string;
}

export interface RuleConditions {
  geo?: GeoCondition;
  device?: DeviceCondition;
  time?: TimeCondition;
  language?: LanguageCondition;
  referrer?: ReferrerCondition;
  queryParams?: QueryParamCondition[];
}

@Entity('redirect_rules')
export class RedirectRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  linkId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  targetUrl: string;

  @Column({
    type: 'enum',
    enum: RuleType,
    array: true,
  })
  types: RuleType[];

  @Column('jsonb')
  conditions: RuleConditions;

  @Column({ default: 0 })
  priority: number;  // Higher priority rules are evaluated first

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  matchCount: number;

  @Column({ nullable: true })
  lastMatchedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Rule Group for complex AND/OR logic
@Entity('redirect_rule_groups')
export class RedirectRuleGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  linkId: string;

  @Column()
  name: string;

  @Column({ default: 'and' })
  operator: 'and' | 'or';  // How to combine rules in this group

  @Column('uuid', { array: true })
  ruleIds: string[];

  @Column()
  targetUrl: string;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
