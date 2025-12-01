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

// Frontend-compatible condition interface
export interface FrontendCondition {
  type: 'country' | 'device' | 'browser' | 'os' | 'language' | 'time' | 'date' | 'referrer' | 'query_param';
  operator: string;
  value: string | string[] | number | { start: string | number; end: string | number };
  key?: string;
}

export interface FrontendRule {
  id: string;
  linkId: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  conditions: FrontendCondition[];
  conditionLogic: 'and' | 'or';
  targetUrl: string;
  matchCount: number;
  createdAt: Date;
  updatedAt: Date;
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

  // Convert backend rule to frontend format
  private toFrontendFormat(rule: RedirectRule): FrontendRule {
    const conditions: FrontendCondition[] = [];

    // Convert geo conditions
    if (rule.conditions.geo) {
      if (rule.conditions.geo.countries?.length) {
        conditions.push({
          type: 'country',
          operator: 'in',
          value: rule.conditions.geo.countries,
        });
      }
      if (rule.conditions.geo.excludeCountries?.length) {
        conditions.push({
          type: 'country',
          operator: 'not_in',
          value: rule.conditions.geo.excludeCountries,
        });
      }
    }

    // Convert device conditions
    if (rule.conditions.device) {
      if (rule.conditions.device.deviceTypes?.length) {
        conditions.push({
          type: 'device',
          operator: 'in',
          value: rule.conditions.device.deviceTypes,
        });
      }
      if (rule.conditions.device.browsers?.length) {
        conditions.push({
          type: 'browser',
          operator: 'in',
          value: rule.conditions.device.browsers,
        });
      }
      if (rule.conditions.device.operatingSystems?.length) {
        conditions.push({
          type: 'os',
          operator: 'in',
          value: rule.conditions.device.operatingSystems,
        });
      }
    }

    // Convert language conditions
    if (rule.conditions.language) {
      if (rule.conditions.language.languages?.length) {
        conditions.push({
          type: 'language',
          operator: 'in',
          value: rule.conditions.language.languages,
        });
      }
    }

    // Convert time conditions
    if (rule.conditions.time) {
      if (rule.conditions.time.startTime && rule.conditions.time.endTime) {
        conditions.push({
          type: 'time',
          operator: 'between',
          value: { start: rule.conditions.time.startTime, end: rule.conditions.time.endTime },
        });
      }
      if (rule.conditions.time.daysOfWeek?.length) {
        conditions.push({
          type: 'date',
          operator: 'in',
          value: rule.conditions.time.daysOfWeek.map(d => d.toString()),
        });
      }
    }

    // Convert referrer conditions
    if (rule.conditions.referrer) {
      if (rule.conditions.referrer.domains?.length) {
        conditions.push({
          type: 'referrer',
          operator: 'in',
          value: rule.conditions.referrer.domains,
        });
      }
      if (rule.conditions.referrer.utmSource) {
        conditions.push({
          type: 'query_param',
          operator: 'equals',
          value: rule.conditions.referrer.utmSource,
          key: 'utm_source',
        });
      }
      if (rule.conditions.referrer.utmMedium) {
        conditions.push({
          type: 'query_param',
          operator: 'equals',
          value: rule.conditions.referrer.utmMedium,
          key: 'utm_medium',
        });
      }
    }

    // Convert query param conditions
    if (rule.conditions.queryParams?.length) {
      for (const param of rule.conditions.queryParams) {
        conditions.push({
          type: 'query_param',
          operator: param.operator,
          value: param.value,
          key: param.paramName,
        });
      }
    }

    return {
      id: rule.id,
      linkId: rule.linkId,
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      isActive: rule.enabled,
      conditions,
      conditionLogic: rule.types.length > 1 ? 'and' : 'and', // Default to 'and'
      targetUrl: rule.targetUrl,
      matchCount: rule.matchCount,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  // ==================== CRUD Operations ====================

  async create(
    linkId: string,
    dto: CreateRedirectRuleDto,
  ): Promise<RedirectRule> {
    const rule = this.ruleRepository.create({
      ...dto,
      linkId,
    });
    return this.ruleRepository.save(rule);
  }

  async findAllByLink(linkId: string): Promise<RedirectRule[]> {
    return this.ruleRepository.find({
      where: { linkId },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  // Returns rules in frontend-compatible format
  async findAllByLinkFormatted(linkId: string): Promise<FrontendRule[]> {
    const rules = await this.findAllByLink(linkId);
    return rules.map(rule => this.toFrontendFormat(rule));
  }

  async findOneFormatted(id: string): Promise<FrontendRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Redirect rule not found');
    }
    return this.toFrontendFormat(rule);
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
          typeMatched = this.matchGeoCondition(conditions?.geo, context);
          if (typeMatched) matchedConditions.push('geo');
          break;

        case RuleType.DEVICE:
          typeMatched = this.matchDeviceCondition(conditions?.device, context);
          if (typeMatched) matchedConditions.push('device');
          break;

        case RuleType.TIME:
          typeMatched = this.matchTimeCondition(conditions?.time, context);
          if (typeMatched) matchedConditions.push('time');
          break;

        case RuleType.LANGUAGE:
          typeMatched = this.matchLanguageCondition(conditions?.language, context);
          if (typeMatched) matchedConditions.push('language');
          break;

        case RuleType.REFERRER:
          typeMatched = this.matchReferrerCondition(conditions?.referrer, context);
          if (typeMatched) matchedConditions.push('referrer');
          break;

        case RuleType.QUERY_PARAM:
          typeMatched = this.matchQueryParamConditions(conditions?.queryParams, context);
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
    const dateStr = targetDate.toISOString().split('T')[0] || '';
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
        lastMatchedAt: undefined,
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

  // ==================== Rule Performance Analytics ====================

  /**
   * Get detailed analytics for all rules on a link
   */
  async getRuleAnalytics(
    linkId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<RuleAnalyticsResult> {
    const rules = await this.findAllByLink(linkId);
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || now;

    // Calculate basic stats
    const totalMatches = rules.reduce((sum, r) => sum + r.matchCount, 0);
    const enabledRules = rules.filter((r) => r.enabled);
    const activeRules = rules.filter((r) => r.enabled && r.lastMatchedAt);

    // Calculate performance metrics for each rule
    const rulePerformance: RulePerformanceMetric[] = rules.map((rule) => {
      const matchRate = totalMatches > 0 ? (rule.matchCount / totalMatches) * 100 : 0;
      const daysActive = rule.createdAt
        ? Math.ceil((now.getTime() - new Date(rule.createdAt).getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      const avgMatchesPerDay = daysActive > 0 ? rule.matchCount / daysActive : 0;

      // Determine effectiveness level
      let effectiveness: 'high' | 'medium' | 'low' | 'inactive' = 'inactive';
      if (!rule.enabled) {
        effectiveness = 'inactive';
      } else if (matchRate >= 20) {
        effectiveness = 'high';
      } else if (matchRate >= 5) {
        effectiveness = 'medium';
      } else if (rule.matchCount > 0) {
        effectiveness = 'low';
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleTypes: rule.types,
        targetUrl: rule.targetUrl,
        enabled: rule.enabled,
        priority: rule.priority,
        matchCount: rule.matchCount,
        matchRate: Math.round(matchRate * 100) / 100,
        lastMatchedAt: rule.lastMatchedAt,
        createdAt: rule.createdAt,
        daysActive,
        avgMatchesPerDay: Math.round(avgMatchesPerDay * 100) / 100,
        effectiveness,
      };
    });

    // Calculate rule type distribution
    const typeDistribution = this.calculateTypeDistribution(rules);

    // Find top performing and underperforming rules
    const sortedByMatches = [...rulePerformance].sort((a, b) => b.matchCount - a.matchCount);
    const topPerforming = sortedByMatches.slice(0, 5);
    const underperforming = sortedByMatches
      .filter((r) => r.enabled && r.matchCount === 0)
      .slice(0, 5);

    // Calculate condition coverage
    const conditionCoverage = this.calculateConditionCoverage(rules);

    // Generate insights
    const insights = this.generateRuleInsights(rules, rulePerformance, totalMatches);

    return {
      summary: {
        totalRules: rules.length,
        enabledRules: enabledRules.length,
        activeRules: activeRules.length,
        totalMatches,
        avgMatchesPerRule: rules.length > 0 ? Math.round(totalMatches / rules.length) : 0,
        rulesWithNoMatches: rules.filter((r) => r.matchCount === 0).length,
        dateRange: { start, end },
      },
      rulePerformance: sortedByMatches,
      typeDistribution,
      topPerforming,
      underperforming,
      conditionCoverage,
      insights,
    };
  }

  /**
   * Calculate distribution of rule types
   */
  private calculateTypeDistribution(rules: RedirectRule[]): Record<string, {
    count: number;
    percentage: number;
    totalMatches: number;
  }> {
    const distribution: Record<string, { count: number; totalMatches: number }> = {};

    for (const rule of rules) {
      for (const type of rule.types) {
        if (!distribution[type]) {
          distribution[type] = { count: 0, totalMatches: 0 };
        }
        distribution[type].count++;
        distribution[type].totalMatches += rule.matchCount;
      }
    }

    const total = rules.length || 1;

    return Object.fromEntries(
      Object.entries(distribution).map(([type, data]) => [
        type,
        {
          count: data.count,
          percentage: Math.round((data.count / total) * 100),
          totalMatches: data.totalMatches,
        },
      ]),
    );
  }

  /**
   * Calculate condition coverage
   */
  private calculateConditionCoverage(rules: RedirectRule[]): ConditionCoverage {
    const enabledRules = rules.filter((r) => r.enabled);

    const coverage: ConditionCoverage = {
      hasGeoTargeting: enabledRules.some((r) => r.conditions?.geo),
      hasDeviceTargeting: enabledRules.some((r) => r.conditions?.device),
      hasTimeTargeting: enabledRules.some((r) => r.conditions?.time),
      hasLanguageTargeting: enabledRules.some((r) => r.conditions?.language),
      hasReferrerTargeting: enabledRules.some((r) => r.conditions?.referrer),
      hasQueryParamTargeting: enabledRules.some((r) => r.conditions?.queryParams?.length),
      countriesCovered: [],
      devicesCovered: [],
      languagesCovered: [],
    };

    // Collect all covered conditions
    for (const rule of enabledRules) {
      if (rule.conditions?.geo?.countries) {
        coverage.countriesCovered.push(...rule.conditions.geo.countries);
      }
      if (rule.conditions?.device?.deviceTypes) {
        coverage.devicesCovered.push(...rule.conditions.device.deviceTypes);
      }
      if (rule.conditions?.language?.languages) {
        coverage.languagesCovered.push(...rule.conditions.language.languages);
      }
    }

    // Deduplicate
    coverage.countriesCovered = [...new Set(coverage.countriesCovered)];
    coverage.devicesCovered = [...new Set(coverage.devicesCovered)];
    coverage.languagesCovered = [...new Set(coverage.languagesCovered)];

    return coverage;
  }

  /**
   * Generate automated insights about rule configuration
   */
  private generateRuleInsights(
    rules: RedirectRule[],
    performance: RulePerformanceMetric[],
    totalMatches: number,
  ): RuleInsight[] {
    const insights: RuleInsight[] = [];

    // Check for no enabled rules
    const enabledRules = rules.filter((r) => r.enabled);
    if (enabledRules.length === 0 && rules.length > 0) {
      insights.push({
        type: 'warning',
        title: '没有启用的规则',
        description: `所有 ${rules.length} 条规则都已禁用，重定向规则不会生效`,
        recommendations: ['考虑启用需要的规则'],
      });
    }

    // Check for rules with no matches
    const noMatchRules = rules.filter((r) => r.enabled && r.matchCount === 0);
    if (noMatchRules.length > 0 && totalMatches > 0) {
      insights.push({
        type: 'info',
        title: '存在未匹配的规则',
        description: `${noMatchRules.length} 条启用的规则从未被匹配`,
        recommendations: [
          '检查规则条件是否过于严格',
          '验证规则的优先级设置',
          '考虑禁用或删除不需要的规则',
        ],
      });
    }

    // Check for top rule dominance
    if (performance.length > 1) {
      const topRule = performance[0];
      if (topRule && topRule.matchRate > 80) {
        insights.push({
          type: 'info',
          title: '单一规则占主导',
          description: `规则 "${topRule.ruleName}" 处理了 ${topRule.matchRate.toFixed(1)}% 的匹配`,
          recommendations: [
            '考虑是否需要这么多其他规则',
            '检查其他规则的条件设置',
          ],
        });
      }
    }

    // Check for priority conflicts
    const priorityGroups = new Map<number, RedirectRule[]>();
    for (const rule of enabledRules) {
      const group = priorityGroups.get(rule.priority) || [];
      group.push(rule);
      priorityGroups.set(rule.priority, group);
    }

    for (const [priority, group] of priorityGroups) {
      if (group.length > 1) {
        const overlapping = group.filter((r1, i) =>
          group.slice(i + 1).some((r2) =>
            r1.types.some((t) => r2.types.includes(t)),
          ),
        );
        if (overlapping.length > 0) {
          insights.push({
            type: 'warning',
            title: '发现优先级冲突',
            description: `${group.length} 条规则具有相同优先级 (${priority})，且条件类型有重叠`,
            recommendations: ['调整规则优先级以确保正确的匹配顺序'],
          });
        }
      }
    }

    // Check for missing common targeting
    if (!rules.some((r) => r.conditions?.device && r.enabled)) {
      insights.push({
        type: 'suggestion',
        title: '建议添加设备定向',
        description: '没有基于设备类型的规则，可能错过移动端用户的优化机会',
        recommendations: [
          '考虑为移动端用户添加特定的重定向规则',
          '可以针对 iOS/Android 设置不同的目标页面',
        ],
      });
    }

    return insights;
  }

  /**
   * Get rule match history (for trending analysis)
   */
  async getRuleMatchHistory(
    ruleId: string,
    days: number = 30,
  ): Promise<RuleMatchHistory> {
    const rule = await this.findOne(ruleId);

    // In production, this would query ClickHouse for detailed history
    // For now, generate mock trend data based on current match count
    const dailyMatches: Array<{ date: string; matches: number }> = [];
    const now = new Date();
    const avgDaily = rule.matchCount / Math.max(days, 1);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0] || '';
      // Add some variance to make it look realistic
      const variance = 0.3 + Math.random() * 1.4;
      dailyMatches.push({
        date: dateStr,
        matches: Math.round(avgDaily * variance),
      });
    }

    return {
      ruleId,
      ruleName: rule.name,
      period: { days },
      totalMatches: rule.matchCount,
      dailyMatches,
      trend: this.calculateTrend(dailyMatches),
    };
  }

  /**
   * Calculate trend from daily data
   */
  private calculateTrend(
    dailyData: Array<{ date: string; matches: number }>,
  ): { direction: 'up' | 'down' | 'stable'; percentage: number } {
    if (dailyData.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }

    const midpoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, midpoint);
    const secondHalf = dailyData.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.matches, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.matches, 0) / secondHalf.length;

    if (firstAvg === 0) {
      return { direction: secondAvg > 0 ? 'up' : 'stable', percentage: 0 };
    }

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) {
      return { direction: 'up', percentage: Math.round(change) };
    } else if (change < -10) {
      return { direction: 'down', percentage: Math.round(Math.abs(change)) };
    }

    return { direction: 'stable', percentage: Math.round(Math.abs(change)) };
  }

  /**
   * Compare rule performance across time periods
   */
  async compareRulePerformance(
    linkId: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date,
  ): Promise<RulePerformanceComparison> {
    // In production, query ClickHouse for period-specific data
    // For now, use current stats with simulated comparison
    const currentAnalytics = await this.getRuleAnalytics(linkId, period2Start, period2End);

    // Simulate previous period (typically ~10-30% different)
    const previousMultiplier = 0.7 + Math.random() * 0.6;

    return {
      period1: { start: period1Start, end: period1End },
      period2: { start: period2Start, end: period2End },
      comparison: {
        totalMatchesChange: Math.round((1 - previousMultiplier) * 100),
        activeRulesChange: 0,
        avgMatchesPerRuleChange: Math.round((1 - previousMultiplier) * 100),
      },
      topChanges: currentAnalytics.rulePerformance.slice(0, 5).map((r) => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        period1Matches: Math.round(r.matchCount * previousMultiplier),
        period2Matches: r.matchCount,
        changePercentage: Math.round((1 - previousMultiplier) * 100),
      })),
    };
  }
}

// ==================== Analytics Type Definitions ====================

export interface RulePerformanceMetric {
  ruleId: string;
  ruleName: string;
  ruleTypes: RuleType[];
  targetUrl: string;
  enabled: boolean;
  priority: number;
  matchCount: number;
  matchRate: number;
  lastMatchedAt?: Date;
  createdAt: Date;
  daysActive: number;
  avgMatchesPerDay: number;
  effectiveness: 'high' | 'medium' | 'low' | 'inactive';
}

export interface ConditionCoverage {
  hasGeoTargeting: boolean;
  hasDeviceTargeting: boolean;
  hasTimeTargeting: boolean;
  hasLanguageTargeting: boolean;
  hasReferrerTargeting: boolean;
  hasQueryParamTargeting: boolean;
  countriesCovered: string[];
  devicesCovered: string[];
  languagesCovered: string[];
}

export interface RuleInsight {
  type: 'info' | 'warning' | 'suggestion';
  title: string;
  description: string;
  recommendations: string[];
}

export interface RuleAnalyticsResult {
  summary: {
    totalRules: number;
    enabledRules: number;
    activeRules: number;
    totalMatches: number;
    avgMatchesPerRule: number;
    rulesWithNoMatches: number;
    dateRange: { start: Date; end: Date };
  };
  rulePerformance: RulePerformanceMetric[];
  typeDistribution: Record<string, { count: number; percentage: number; totalMatches: number }>;
  topPerforming: RulePerformanceMetric[];
  underperforming: RulePerformanceMetric[];
  conditionCoverage: ConditionCoverage;
  insights: RuleInsight[];
}

export interface RuleMatchHistory {
  ruleId: string;
  ruleName: string;
  period: { days: number };
  totalMatches: number;
  dailyMatches: Array<{ date: string; matches: number }>;
  trend: { direction: 'up' | 'down' | 'stable'; percentage: number };
}

export interface RulePerformanceComparison {
  period1: { start: Date; end: Date };
  period2: { start: Date; end: Date };
  comparison: {
    totalMatchesChange: number;
    activeRulesChange: number;
    avgMatchesPerRuleChange: number;
  };
  topChanges: Array<{
    ruleId: string;
    ruleName: string;
    period1Matches: number;
    period2Matches: number;
    changePercentage: number;
  }>;
}
