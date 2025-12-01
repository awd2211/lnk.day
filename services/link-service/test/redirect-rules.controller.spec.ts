import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import {
  RedirectRulesController,
  InternalRedirectRulesController,
} from '../src/modules/redirect-rules/redirect-rules.controller';
import {
  RedirectRulesService,
  FrontendRule,
  VisitorContext,
} from '../src/modules/redirect-rules/redirect-rules.service';
import { RedirectRule, RuleType } from '../src/modules/redirect-rules/entities/redirect-rule.entity';

describe('RedirectRulesController', () => {
  let controller: RedirectRulesController;
  let service: jest.Mocked<RedirectRulesService>;

  const mockFrontendRule: FrontendRule = {
    id: '11111111-1111-1111-1111-111111111111',
    linkId: 'd309ee51-79d7-4f1b-9d40-7b74e8fea6d2',
    name: '中国用户跳转',
    description: '将中国大陆访问者重定向到中文版',
    targetUrl: 'https://cn.example.com',
    priority: 100,
    isActive: true,
    conditions: [
      { type: 'country', operator: 'in', value: ['CN', 'HK', 'TW'] },
    ],
    conditionLogic: 'and',
    matchCount: 156,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBackendRule: RedirectRule = {
    id: '11111111-1111-1111-1111-111111111111',
    linkId: 'd309ee51-79d7-4f1b-9d40-7b74e8fea6d2',
    name: '中国用户跳转',
    description: '将中国大陆访问者重定向到中文版',
    targetUrl: 'https://cn.example.com',
    types: [RuleType.GEO],
    conditions: { geo: { countries: ['CN', 'HK', 'TW'] } },
    priority: 100,
    enabled: true,
    matchCount: 156,
    lastMatchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAllByLinkFormatted: jest.fn(),
      findOneFormatted: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toggleEnabled: jest.fn(),
      reorder: jest.fn(),
      getStats: jest.fn(),
      evaluateRules: jest.fn(),
      duplicateRules: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedirectRulesController],
      providers: [
        {
          provide: RedirectRulesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<RedirectRulesController>(RedirectRulesController);
    service = module.get(RedirectRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new redirect rule', async () => {
      const createDto = {
        name: '新规则',
        targetUrl: 'https://example.com',
        types: [RuleType.GEO],
        conditions: { geo: { countries: ['US'] } },
      };

      service.create.mockResolvedValue(mockBackendRule);

      const result = await controller.create('link-id', createDto);

      expect(service.create).toHaveBeenCalledWith('link-id', createDto);
      expect(result).toEqual(mockBackendRule);
    });
  });

  describe('findAll', () => {
    it('should return all rules in frontend format', async () => {
      service.findAllByLinkFormatted.mockResolvedValue([mockFrontendRule]);

      const result = await controller.findAll('link-id');

      expect(service.findAllByLinkFormatted).toHaveBeenCalledWith('link-id');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('isActive');
      expect(result[0]).toHaveProperty('conditions');
    });
  });

  describe('findOne', () => {
    it('should return a single rule in frontend format', async () => {
      service.findOneFormatted.mockResolvedValue(mockFrontendRule);

      const result = await controller.findOne('rule-id');

      expect(service.findOneFormatted).toHaveBeenCalledWith('rule-id');
      expect(result).toHaveProperty('isActive');
    });
  });

  describe('update', () => {
    it('should update a rule', async () => {
      const updateDto = { name: '更新后的规则' };
      service.update.mockResolvedValue({ ...mockBackendRule, name: '更新后的规则' });

      const result = await controller.update('rule-id', updateDto);

      expect(service.update).toHaveBeenCalledWith('rule-id', updateDto);
      expect(result.name).toBe('更新后的规则');
    });
  });

  describe('remove', () => {
    it('should remove a rule and return success message', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('rule-id');

      expect(service.remove).toHaveBeenCalledWith('rule-id');
      expect(result).toEqual({ message: 'Redirect rule deleted successfully' });
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle rule enabled status', async () => {
      service.toggleEnabled.mockResolvedValue({ ...mockBackendRule, enabled: false });

      const result = await controller.toggleEnabled('rule-id');

      expect(service.toggleEnabled).toHaveBeenCalledWith('rule-id');
      expect(result.enabled).toBe(false);
    });
  });

  describe('reorder', () => {
    it('should reorder rules', async () => {
      const ruleIds = ['id1', 'id2', 'id3'];
      service.reorder.mockResolvedValue([mockBackendRule]);

      const result = await controller.reorder('link-id', { ruleIds });

      expect(service.reorder).toHaveBeenCalledWith('link-id', ruleIds);
    });
  });

  describe('getStats', () => {
    it('should return rule statistics', async () => {
      const stats = {
        totalRules: 3,
        enabledRules: 2,
        totalMatches: 500,
        ruleStats: [],
      };
      service.getStats.mockResolvedValue(stats);

      const result = await controller.getStats('link-id');

      expect(service.getStats).toHaveBeenCalledWith('link-id');
      expect(result).toEqual(stats);
    });
  });

  describe('evaluate', () => {
    it('should evaluate rules and return match result', async () => {
      const evaluateDto = {
        country: 'CN',
        deviceType: 'mobile',
      };

      service.evaluateRules.mockResolvedValue({
        matched: true,
        rule: mockBackendRule,
        targetUrl: 'https://cn.example.com',
        matchedConditions: ['geo.country'],
      });

      const result = await controller.evaluate('link-id', evaluateDto);

      expect(result).toHaveProperty('matched', true);
      expect(result).toHaveProperty('targetUrl', 'https://cn.example.com');
      expect(result).toHaveProperty('matchedRule');
      expect(result).toHaveProperty('testedContext');
    });

    it('should return no match when rules do not apply', async () => {
      const evaluateDto = {
        country: 'US',
        deviceType: 'desktop',
      };

      service.evaluateRules.mockResolvedValue({
        matched: false,
        rule: undefined,
        targetUrl: undefined,
        matchedConditions: [],
      });

      const result = await controller.evaluate('link-id', evaluateDto);

      expect(result).toHaveProperty('matched', false);
      expect(result.matchedRule).toBeNull();
    });
  });

  describe('duplicate', () => {
    it('should duplicate rules to another link', async () => {
      service.duplicateRules.mockResolvedValue([mockBackendRule]);

      const result = await controller.duplicate('link-id', { targetLinkId: 'target-link-id' });

      expect(service.duplicateRules).toHaveBeenCalledWith('link-id', 'target-link-id');
    });
  });
});

describe('InternalRedirectRulesController', () => {
  let controller: InternalRedirectRulesController;
  let service: jest.Mocked<RedirectRulesService>;

  beforeEach(async () => {
    const mockService = {
      evaluateRules: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalRedirectRulesController],
      providers: [
        {
          provide: RedirectRulesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<InternalRedirectRulesController>(InternalRedirectRulesController);
    service = module.get(RedirectRulesService);
  });

  describe('evaluateForRedirect', () => {
    it('should evaluate rules for internal redirect service', async () => {
      const context: VisitorContext = {
        country: 'CN',
        deviceType: 'mobile',
        browser: 'Chrome',
      };

      service.evaluateRules.mockResolvedValue({
        matched: true,
        rule: {} as RedirectRule,
        targetUrl: 'https://cn.example.com',
        matchedConditions: ['geo'],
      });

      const result = await controller.evaluateForRedirect('link-id', context);

      expect(service.evaluateRules).toHaveBeenCalledWith('link-id', context);
      expect(result.matched).toBe(true);
    });
  });
});
