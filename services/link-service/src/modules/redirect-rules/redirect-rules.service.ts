import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  RedirectRule,
  RedirectRuleGroup,
  RuleType,
  RuleOperator,
  RuleConditions,
  GeoCondition,
  DeviceCondition,
  TimeCondition,
  LanguageCondition,
  ReferrerCondition,
  QueryParamCondition,
} from './entities/redirect-rule.entity';
import {
  CreateRedirectRuleDto,
  UpdateRedirectRuleDto,
  EvaluateRulesDto,
} from './dto/redirect-rule.dto';

export interface VisitorContext {
  country?: string;
  region?: string;
  city?: string;
  continent?: string;
  deviceType?: string;
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  language?: string;
  referrer?: string;
  referrerDomain?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  queryParams?: Record<string, string>;
  timestamp?: Date;
}

export interface RuleMatchResult {
  matched: boolean;
  rule?: RedirectRule;
  targetUrl?: string;
  matchedConditions?: string[];
}

@Injectable()
export class RedirectRulesService {
  private readonly logger = new Logger(RedirectRulesService.name);

  constructor(
    @InjectRepository(RedirectRule)
    private readonly ruleRepository: Repository<RedirectRule>,
    @InjectRepository(RedirectRuleGroup)
    private readonly ruleGroupRepository: Repository<RedirectRuleGroup>,
  ) {}

  // ==================== CRUD Operations ====================

  async create(
    linkId: string,
    dto: CreateRedirectRuleDto,
  ): Promise<RedirectRule> {
    const rule = this.ruleRepository.create({
      linkId,
      ...dto,
    });
    return this.ruleRepository.save(rule);
  }

  async findAllByLink(linkId: string): Promise<RedirectRule[]> {
    return this.ruleRepository.find({
      where: { linkId },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<RedirectRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Redirect rule not found');
    }
    return rule;
  }

  async update(id: string, dto: UpdateRedirectRuleDto): Promise<RedirectRule> {
    const rule = await this.findOne(id);
    Object.assign(rule, dto);
    return this.ruleRepository.save(rule);
  }

  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    await this.ruleRepository.remove(rule);
  }

  async toggleEnabled(id: string): Promise<RedirectRule> {
    const rule = await this.findOne(id);
    rule.enabled = !rule.enabled;
    return this.ruleRepository.save(rule);
  }

  async reorder(linkId: string, ruleIds: string[]): Promise<RedirectRule[]> {
    const rules = await this.findAllByLink(linkId);
    const ruleMap = new Map(rules.map((r) => [r.id, r]));

    const updates = ruleIds.map((id, index) => {
      const rule = ruleMap.get(id);
      if (!rule) {
        throw new BadRequestException(`Rule ${id} not found`);
      }
      rule.priority = ruleIds.length - index; // Higher index = lower priority
      return rule;
    });

    return this.ruleRepository.save(updates);
  }

  // ==================== Rule Evaluation ====================

  async evaluateRules(
    linkId: string,
    context: VisitorContext,
  ): Promise<RuleMatchResult> {
    const rules = await this.ruleRepository.find({
      where: { linkId, enabled: true },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });

    for (const rule of rules) {
      const matchResult = this.matchRule(rule, context);
      if (matchResult.matched) {
        // Update match statistics
        await this.ruleRepository.update(rule.id, {
          matchCount: () => 'match_count + 1',
          lastMatchedAt: new Date(),
        });

        return {
          matched: true,
          rule,
          targetUrl: rule.targetUrl,
          matchedConditions: matchResult.matchedConditions,
        };
      }
    }

    return { matched: false };
  }

  matchRule(
    rule: RedirectRule,
    context: VisitorContext,
  ): { matched: boolean; matchedConditions: string[] } {
    const matchedConditions: string[] = [];
    const conditions = rule.conditions;

    // Check each rule type
    for (const ruleType of rule.types) {
      let typeMatched = false;

      switch (ruleType) {
        case RuleType.GEO:
          typeMatched = this.matchGeoCondition(conditions.geo, context);
          if (typeMatched) matchedConditions.push('geo');
          break;

        case RuleType.DEVICE:
          typeMatched = this.matchDeviceCondition(conditions.device, context);
          if (typeMatched) matchedConditions.push('device');
          break;

        case RuleType.TIME:
          typeMatched = this.matchTimeCondition(conditions.time, context);
          if (typeMatched) matchedConditions.push('time');
          break;

        case RuleType.LANGUAGE:
          typeMatched = this.matchLanguageCondition(conditions.language, context);
          if (typeMatched) matchedConditions.push('language');
          break;

        case RuleType.REFERRER:
          typeMatched = this.matchReferrerCondition(conditions.referrer, context);
          if (typeMatched) matchedConditions.push('referrer');
          break;

        case RuleType.QUERY_PARAM:
          typeMatched = this.matchQueryParamConditions(conditions.queryParams, context);
          if (typeMatched) matchedConditions.push('query_param');
          break;
      }

      // All rule types must match (AND logic)
      if (!typeMatched) {
        return { matched: false, matchedConditions: [] };
      }
    }

    return { matched: true, matchedConditions };
  }

  // ==================== Condition Matchers ====================

  private matchGeoCondition(
    condition: GeoCondition | undefined,
    context: VisitorContext,
  ): boolean {
    if (!condition) return true;

    // Check exclusions first
    if (condition.excludeCountries?.length) {
      if (context.country && condition.excludeCountries.includes(context.country.toUpperCase())) {
        return false;
      }
    }

    if (condition.excludeRegions?.length) {
      if (context.region && condition.excludeRegions.includes(context.region)) {
        return false;
      }
    }

    // Check inclusions
    if (condition.continents?.length) {
      if (!context.continent || !condition.continents.includes(context.continent)) {
        return false;
      }
    }

    if (condition.countries?.length) {
      if (!context.country || !condition.countries.includes(context.country.toUpperCase())) {
        return false;
      }
    }

    if (condition.regions?.length) {
      if (!context.region || !condition.regions.includes(context.region)) {
        return false;
      }
    }

    if (condition.cities?.length) {
      if (!context.city || !condition.cities.some(
        (c) => c.toLowerCase() === context.city?.toLowerCase()
      )) {
        return false;
      }
    }

    return true;
  }

  private matchDeviceCondition(
    condition: DeviceCondition | undefined,
    context: VisitorContext,
  ): boolean {
    if (!condition) return true;

    if (condition.deviceTypes?.length) {
      if (!context.deviceType || !condition.deviceTypes.includes(
        context.deviceType.toLowerCase() as any
      )) {
        return false;
      }
    }

    if (condition.operatingSystems?.length) {
      if (!context.os || !condition.operatingSystems.some(
        (os) => os.toLowerCase() === context.os?.toLowerCase()
      )) {
        return false;
      }
    }

    if (condition.browsers?.length) {
      if (!context.browser || !condition.browsers.some(
        (b) => b.toLowerCase() === context.browser?.toLowerCase()
      )) {
        return false;
      }
    }

    // Version comparison
    if (condition.minOsVersion && context.osVersion) {
      if (this.compareVersions(context.osVersion, condition.minOsVersion) < 0) {
        return false;
      }
    }

    if (condition.maxOsVersion && context.osVersion) {
      if (this.compareVersions(context.osVersion, condition.maxOsVersion) > 0) {
        return false;
      }
    }

    return true;
  }

  private matchTimeCondition(
    condition: TimeCondition | undefined,
    context: VisitorContext,
  ): boolean {
    if (!condition) return true;

    const now = context.timestamp || new Date();
    const timezone = condition.timezone || 'UTC';

    // Convert to target timezone
    const targetDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const dateStr = targetDate.toISOString().split('T')[0];
    const timeStr = targetDate.toTimeString().slice(0, 5);
    const dayOfWeek = targetDate.getDay();

    // Check date range
    if (condition.startDate && dateStr < condition.startDate) {
      return false;
    }

    if (condition.endDate && dateStr > condition.endDate) {
      return false;
    }

    // Check time range
    if (condition.startTime && condition.endTime) {
      // Handle overnight ranges (e.g., 22:00 - 06:00)
      if (condition.startTime <= condition.endTime) {
        if (timeStr < condition.startTime || timeStr > condition.endTime) {
          return false;
        }
      } else {
        // Overnight range
        if (timeStr < condition.startTime && timeStr > condition.endTime) {
          return false;
        }
      }
    } else if (condition.startTime && timeStr < condition.startTime) {
      return false;
    } else if (condition.endTime && timeStr > condition.endTime) {
      return false;
    }

    // Check day of week
    if (condition.daysOfWeek?.length) {
      if (!condition.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  }

  private matchLanguageCondition(
    condition: LanguageCondition | undefined,
    context: VisitorContext,
  ): boolean {
    if (!condition) return true;

    const lang = context.language?.split('-')[0]?.toLowerCase();

    if (condition.excludeLanguages?.length) {
      if (lang && condition.excludeLanguages.some(
        (l) => l.toLowerCase() === lang
      )) {
        return false;
      }
    }

    if (condition.languages?.length) {
      if (!lang || !condition.languages.some(
        (l) => l.toLowerCase() === lang
      )) {
        return false;
      }
    }

    return true;
  }

  private matchReferrerCondition(
    condition: ReferrerCondition | undefined,
    context: VisitorContext,
  ): boolean {
    if (!condition) return true;

    // Extract domain from referrer
    const referrerDomain = context.referrerDomain || this.extractDomain(context.referrer);

    if (condition.excludeDomains?.length) {
      if (referrerDomain && condition.excludeDomains.some(
        (d) => referrerDomain.includes(d.toLowerCase())
      )) {
        return false;
      }
    }

    if (condition.domains?.length) {
      if (!referrerDomain || !condition.domains.some(
        (d) => referrerDomain.includes(d.toLowerCase())
      )) {
        return false;
      }
    }

    // Check UTM parameters
    if (condition.utmSource && context.utmSource !== condition.utmSource) {
      return false;
    }

    if (condition.utmMedium && context.utmMedium !== condition.utmMedium) {
      return false;
    }

    if (condition.utmCampaign && context.utmCampaign !== condition.utmCampaign) {
      return false;
    }

    return true;
  }

  private matchQueryParamConditions(
    conditions: QueryParamCondition[] | undefined,
    context: VisitorContext,
  ): boolean {
    if (!conditions?.length) return true;

    const params = context.queryParams || {};

    for (const condition of conditions) {
      const value = params[condition.paramName];
      if (!this.matchOperator(value, condition.operator, condition.value)) {
        return false;
      }
    }

    return true;
  }

  // ==================== Helper Methods ====================

  private matchOperator(
    actual: string | undefined,
    operator: RuleOperator,
    expected: string,
  ): boolean {
    const actualLower = actual?.toLowerCase() || '';
    const expectedLower = expected.toLowerCase();

    switch (operator) {
      case RuleOperator.EQUALS:
        return actualLower === expectedLower;

      case RuleOperator.NOT_EQUALS:
        return actualLower !== expectedLower;

      case RuleOperator.CONTAINS:
        return actualLower.includes(expectedLower);

      case RuleOperator.NOT_CONTAINS:
        return !actualLower.includes(expectedLower);

      case RuleOperator.STARTS_WITH:
        return actualLower.startsWith(expectedLower);

      case RuleOperator.ENDS_WITH:
        return actualLower.endsWith(expectedLower);

      case RuleOperator.IN:
        const inValues = expected.split(',').map((v) => v.trim().toLowerCase());
        return inValues.includes(actualLower);

      case RuleOperator.NOT_IN:
        const notInValues = expected.split(',').map((v) => v.trim().toLowerCase());
        return !notInValues.includes(actualLower);

      case RuleOperator.REGEX:
        try {
          const regex = new RegExp(expected, 'i');
          return regex.test(actual || '');
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const len = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < len; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  private extractDomain(url: string | undefined): string | undefined {
    if (!url) return undefined;
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return undefined;
    }
  }

  // ==================== Bulk Operations ====================

  async duplicateRules(
    fromLinkId: string,
    toLinkId: string,
  ): Promise<RedirectRule[]> {
    const sourceRules = await this.findAllByLink(fromLinkId);

    const newRules = sourceRules.map((rule) => {
      const { id, linkId, matchCount, lastMatchedAt, createdAt, updatedAt, ...data } = rule;
      return this.ruleRepository.create({
        ...data,
        linkId: toLinkId,
        matchCount: 0,
        lastMatchedAt: null,
      });
    });

    return this.ruleRepository.save(newRules);
  }

  async getStats(linkId: string): Promise<{
    totalRules: number;
    enabledRules: number;
    totalMatches: number;
    ruleStats: Array<{ id: string; name: string; matchCount: number; lastMatchedAt?: Date }>;
  }> {
    const rules = await this.findAllByLink(linkId);

    return {
      totalRules: rules.length,
      enabledRules: rules.filter((r) => r.enabled).length,
      totalMatches: rules.reduce((sum, r) => sum + r.matchCount, 0),
      ruleStats: rules.map((r) => ({
        id: r.id,
        name: r.name,
        matchCount: r.matchCount,
        lastMatchedAt: r.lastMatchedAt,
      })),
    };
  }
}
