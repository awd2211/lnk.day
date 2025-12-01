import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import {
  RedirectRulesService,
  VisitorContext,
} from '../src/modules/redirect-rules/redirect-rules.service';
import {
  RedirectRule,
  RedirectRuleGroup,
  RuleType,
} from '../src/modules/redirect-rules/entities/redirect-rule.entity';

describe('RedirectRulesService', () => {
  let service: RedirectRulesService;
  let ruleRepository: jest.Mocked<Repository<RedirectRule>>;
  let ruleGroupRepository: jest.Mocked<Repository<RedirectRuleGroup>>;

  const mockRule: RedirectRule = {
    id: '11111111-1111-1111-1111-111111111111',
    linkId: 'd309ee51-79d7-4f1b-9d40-7b74e8fea6d2',
    name: '中国用户跳转',
    description: '将中国大陆访问者重定向到中文版',
    targetUrl: 'https://cn.example.com',
    types: [RuleType.GEO],
    conditions: {
      geo: { countries: ['CN', 'HK', 'TW'] },
    },
    priority: 100,
    enabled: true,
    matchCount: 156,
    lastMatchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRules: RedirectRule[] = [
    mockRule,
    {
      ...mockRule,
      id: '22222222-2222-2222-2222-222222222222',
      name: '移动设备跳转',
      types: [RuleType.DEVICE],
      conditions: {
        device: { deviceTypes: ['mobile', 'tablet'] as ('mobile' | 'tablet' | 'desktop')[] },
      },
      priority: 90,
      matchCount: 89,
    },
    {
      ...mockRule,
      id: '33333333-3333-3333-3333-333333333333',
      name: '工作时间规则',
      types: [RuleType.TIME],
      conditions: {
        time: {
          startTime: '09:00',
          endTime: '18:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          timezone: 'Asia/Shanghai',
        },
      },
      priority: 80,
      matchCount: 234,
    },
  ];

  beforeEach(async () => {
    const mockRuleRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    const mockRuleGroupRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedirectRulesService,
        {
          provide: getRepositoryToken(RedirectRule),
          useValue: mockRuleRepository,
        },
        {
          provide: getRepositoryToken(RedirectRuleGroup),
          useValue: mockRuleGroupRepository,
        },
      ],
    }).compile();

    service = module.get<RedirectRulesService>(RedirectRulesService);
    ruleRepository = module.get(getRepositoryToken(RedirectRule));
    ruleGroupRepository = module.get(getRepositoryToken(RedirectRuleGroup));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should create a new redirect rule', async () => {
        const createDto = {
          name: '新规则',
          targetUrl: 'https://example.com',
          types: [RuleType.GEO],
          conditions: { geo: { countries: ['US'] } },
        };

        ruleRepository.create.mockReturnValue({ ...mockRule, ...createDto } as RedirectRule);
        ruleRepository.save.mockResolvedValue({ ...mockRule, ...createDto } as RedirectRule);

        const result = await service.create('link-id', createDto);

        expect(ruleRepository.create).toHaveBeenCalledWith({
          ...createDto,
          linkId: 'link-id',
        });
        expect(ruleRepository.save).toHaveBeenCalled();
        expect(result.name).toBe('新规则');
      });
    });

    describe('findAllByLink', () => {
      it('should return all rules for a link ordered by priority', async () => {
        ruleRepository.find.mockResolvedValue(mockRules);

        const result = await service.findAllByLink('link-id');

        expect(ruleRepository.find).toHaveBeenCalledWith({
          where: { linkId: 'link-id' },
          order: { priority: 'DESC', createdAt: 'ASC' },
        });
        expect(result).toHaveLength(3);
      });
    });

    describe('findAllByLinkFormatted', () => {
      it('should return rules in frontend-compatible format', async () => {
        ruleRepository.find.mockResolvedValue([mockRule]);

        const result = await service.findAllByLinkFormatted('link-id');

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('isActive', true);
        expect(result[0]).toHaveProperty('conditionLogic', 'and');
        expect(result[0]!.conditions).toBeInstanceOf(Array);
        expect(result[0]!.conditions[0]).toHaveProperty('type', 'country');
        expect(result[0]!.conditions[0]).toHaveProperty('operator', 'in');
        expect(result[0]!.conditions[0]).toHaveProperty('value', ['CN', 'HK', 'TW']);
      });
    });

    describe('findOne', () => {
      it('should return a rule by id', async () => {
        ruleRepository.findOne.mockResolvedValue(mockRule);

        const result = await service.findOne('rule-id');

        expect(ruleRepository.findOne).toHaveBeenCalledWith({ where: { id: 'rule-id' } });
        expect(result).toEqual(mockRule);
      });

      it('should throw NotFoundException if rule not found', async () => {
        ruleRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      it('should update a rule', async () => {
        const updateDto = { name: '更新后的规则' };
        ruleRepository.findOne.mockResolvedValue(mockRule);
        ruleRepository.save.mockResolvedValue({ ...mockRule, ...updateDto });

        const result = await service.update('rule-id', updateDto);

        expect(result.name).toBe('更新后的规则');
      });
    });

    describe('remove', () => {
      it('should remove a rule', async () => {
        ruleRepository.findOne.mockResolvedValue(mockRule);
        ruleRepository.remove.mockResolvedValue(mockRule);

        await service.remove('rule-id');

        expect(ruleRepository.remove).toHaveBeenCalledWith(mockRule);
      });
    });

    describe('toggleEnabled', () => {
      it('should toggle rule enabled status', async () => {
        ruleRepository.findOne.mockResolvedValue({ ...mockRule, enabled: true });
        ruleRepository.save.mockResolvedValue({ ...mockRule, enabled: false });

        const result = await service.toggleEnabled('rule-id');

        expect(result.enabled).toBe(false);
      });
    });
  });

  describe('Rule Evaluation', () => {
    describe('evaluateRules', () => {
      it('should match geo rule for Chinese visitor', async () => {
        ruleRepository.find.mockResolvedValue([mockRule]);
        ruleRepository.update.mockResolvedValue({ affected: 1 } as any);

        const context: VisitorContext = {
          country: 'CN',
          deviceType: 'desktop',
        };

        const result = await service.evaluateRules('link-id', context);

        expect(result.matched).toBe(true);
        expect(result.targetUrl).toBe(mockRule.targetUrl);
        expect(result.rule?.id).toBe(mockRule.id);
      });

      it('should not match geo rule for non-Chinese visitor', async () => {
        ruleRepository.find.mockResolvedValue([mockRule]);

        const context: VisitorContext = {
          country: 'US',
          deviceType: 'desktop',
        };

        const result = await service.evaluateRules('link-id', context);

        expect(result.matched).toBe(false);
      });

      it('should match device rule for mobile visitor', async () => {
        const mobileRule: RedirectRule = {
          ...mockRule,
          types: [RuleType.DEVICE],
          conditions: {
            device: { deviceTypes: ['mobile', 'tablet'] as ('mobile' | 'tablet' | 'desktop')[] },
          },
        };
        ruleRepository.find.mockResolvedValue([mobileRule]);
        ruleRepository.update.mockResolvedValue({ affected: 1 } as any);

        const context: VisitorContext = {
          country: 'US',
          deviceType: 'mobile',
        };

        const result = await service.evaluateRules('link-id', context);

        expect(result.matched).toBe(true);
      });

      it('should match language rule', async () => {
        const languageRule: RedirectRule = {
          ...mockRule,
          types: [RuleType.LANGUAGE],
          conditions: {
            language: { languages: ['ja', 'ja-JP'] },
          },
        };
        ruleRepository.find.mockResolvedValue([languageRule]);
        ruleRepository.update.mockResolvedValue({ affected: 1 } as any);

        const context: VisitorContext = {
          language: 'ja',
        };

        const result = await service.evaluateRules('link-id', context);

        expect(result.matched).toBe(true);
      });

      it('should match referrer domain rule', async () => {
        const referrerRule: RedirectRule = {
          ...mockRule,
          types: [RuleType.REFERRER],
          conditions: {
            referrer: { domains: ['google.com', 'google.cn'] },
          },
        };
        ruleRepository.find.mockResolvedValue([referrerRule]);
        ruleRepository.update.mockResolvedValue({ affected: 1 } as any);

        const context: VisitorContext = {
          referrerDomain: 'google.com',
        };

        const result = await service.evaluateRules('link-id', context);

        expect(result.matched).toBe(true);
      });

      it('should skip disabled rules', async () => {
        // The service queries with { enabled: true }, so disabled rules are not returned
        // When there are no enabled rules, it should return no match
        ruleRepository.find.mockResolvedValue([]);

        const context: VisitorContext = {
          country: 'CN',
        };

        const result = await service.evaluateRules('link-id', context);

        expect(result.matched).toBe(false);
      });

      it('should evaluate rules by priority order', async () => {
        const highPriorityRule: RedirectRule = {
          ...mockRule,
          id: 'high-priority',
          priority: 100,
          targetUrl: 'https://high-priority.com',
        };
        const lowPriorityRule: RedirectRule = {
          ...mockRule,
          id: 'low-priority',
          priority: 50,
          targetUrl: 'https://low-priority.com',
        };

        // Rules returned in priority order
        ruleRepository.find.mockResolvedValue([highPriorityRule, lowPriorityRule]);
        ruleRepository.update.mockResolvedValue({ affected: 1 } as any);

        const context: VisitorContext = {
          country: 'CN',
        };

        const result = await service.evaluateRules('link-id', context);

        expect(result.targetUrl).toBe('https://high-priority.com');
      });
    });
  });

  describe('Format Conversion', () => {
    describe('toFrontendFormat', () => {
      it('should convert geo conditions correctly', async () => {
        ruleRepository.find.mockResolvedValue([mockRule]);

        const result = await service.findAllByLinkFormatted('link-id');

        expect(result[0]!.conditions).toContainEqual({
          type: 'country',
          operator: 'in',
          value: ['CN', 'HK', 'TW'],
        });
      });

      it('should convert device conditions correctly', async () => {
        const deviceRule: RedirectRule = {
          ...mockRule,
          types: [RuleType.DEVICE],
          conditions: {
            device: {
              deviceTypes: ['mobile'] as ('mobile' | 'tablet' | 'desktop')[],
              browsers: ['Chrome', 'Safari'],
              operatingSystems: ['iOS'],
            },
          },
        };
        ruleRepository.find.mockResolvedValue([deviceRule]);

        const result = await service.findAllByLinkFormatted('link-id');

        expect(result[0]!.conditions).toContainEqual({
          type: 'device',
          operator: 'in',
          value: ['mobile'],
        });
        expect(result[0]!.conditions).toContainEqual({
          type: 'browser',
          operator: 'in',
          value: ['Chrome', 'Safari'],
        });
        expect(result[0]!.conditions).toContainEqual({
          type: 'os',
          operator: 'in',
          value: ['iOS'],
        });
      });

      it('should convert time conditions correctly', async () => {
        const timeRule: RedirectRule = {
          ...mockRule,
          types: [RuleType.TIME],
          conditions: {
            time: {
              startTime: '09:00',
              endTime: '18:00',
              daysOfWeek: [1, 2, 3, 4, 5],
            },
          },
        };
        ruleRepository.find.mockResolvedValue([timeRule]);

        const result = await service.findAllByLinkFormatted('link-id');

        expect(result[0]!.conditions).toContainEqual({
          type: 'time',
          operator: 'between',
          value: { start: '09:00', end: '18:00' },
        });
        expect(result[0]!.conditions).toContainEqual({
          type: 'date',
          operator: 'in',
          value: ['1', '2', '3', '4', '5'],
        });
      });

      it('should convert referrer UTM conditions correctly', async () => {
        const utmRule: RedirectRule = {
          ...mockRule,
          types: [RuleType.REFERRER],
          conditions: {
            referrer: {
              utmSource: 'newsletter',
              utmMedium: 'email',
            },
          },
        };
        ruleRepository.find.mockResolvedValue([utmRule]);

        const result = await service.findAllByLinkFormatted('link-id');

        expect(result[0]!.conditions).toContainEqual({
          type: 'query_param',
          operator: 'equals',
          value: 'newsletter',
          key: 'utm_source',
        });
        expect(result[0]!.conditions).toContainEqual({
          type: 'query_param',
          operator: 'equals',
          value: 'email',
          key: 'utm_medium',
        });
      });

      it('should set isActive from enabled field', async () => {
        const disabledRule = { ...mockRule, enabled: false };
        ruleRepository.find.mockResolvedValue([disabledRule]);

        const result = await service.findAllByLinkFormatted('link-id');

        expect(result[0]!.isActive).toBe(false);
      });
    });
  });

  describe('Statistics', () => {
    describe('getStats', () => {
      it('should return rule statistics', async () => {
        ruleRepository.find.mockResolvedValue(mockRules);

        const result = await service.getStats('link-id');

        expect(result).toHaveProperty('totalRules', 3);
        expect(result).toHaveProperty('enabledRules');
        expect(result).toHaveProperty('totalMatches');
        expect(result).toHaveProperty('ruleStats');
      });
    });
  });
});
