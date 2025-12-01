import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { ConsentType } from './entities/user-consent.entity';
import { DataRequestType, DataRequestStatus } from './entities/data-request.entity';

describe('PrivacyController', () => {
  let controller: PrivacyController;
  let privacyService: jest.Mocked<PrivacyService>;

  const mockPrivacyService = {
    getPrivacyOverview: jest.fn(),
    getConsents: jest.fn(),
    updateConsent: jest.fn(),
    bulkUpdateConsents: jest.fn(),
    getDataRequests: jest.fn(),
    createDataRequest: jest.fn(),
    cancelDeletionRequest: jest.fn(),
  };

  const mockUser = {
    sub: 'user-123',
    email: 'test@example.com',
    type: 'user',
    scope: { level: 'personal', teamId: 'user-123' },
  };

  const mockConsent = {
    id: 'consent-123',
    userId: 'user-123',
    type: ConsentType.PRIVACY_POLICY,
    granted: true,
    grantedAt: new Date(),
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDataRequest = {
    id: 'request-123',
    userId: 'user-123',
    type: DataRequestType.EXPORT,
    status: DataRequestStatus.PENDING,
    createdAt: new Date(),
    coolingPeriodEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivacyController],
      providers: [
        {
          provide: PrivacyService,
          useValue: mockPrivacyService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<PrivacyController>(PrivacyController);
    privacyService = module.get(PrivacyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return privacy overview', async () => {
      const overview = {
        consents: [mockConsent],
        pendingRequests: [],
        scheduledDeletion: null,
      };
      mockPrivacyService.getPrivacyOverview.mockResolvedValue(overview);

      const result = await controller.getOverview(mockUser as any);

      expect(privacyService.getPrivacyOverview).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(overview);
    });
  });

  describe('getConsents', () => {
    it('should return all consents', async () => {
      mockPrivacyService.getConsents.mockResolvedValue([mockConsent]);

      const result = await controller.getConsents(mockUser as any);

      expect(privacyService.getConsents).toHaveBeenCalledWith('user-123');
      expect(result.consents).toHaveLength(1);
    });
  });

  describe('updateConsent', () => {
    it('should update single consent', async () => {
      const dto = { type: ConsentType.MARKETING_EMAILS, granted: true };
      mockPrivacyService.updateConsent.mockResolvedValue({
        ...mockConsent,
        type: ConsentType.MARKETING_EMAILS,
      });

      const result = await controller.updateConsent(
        dto,
        mockUser as any,
        '127.0.0.1',
        'Test Agent',
      );

      expect(privacyService.updateConsent).toHaveBeenCalledWith(
        'user-123',
        dto,
        '127.0.0.1',
        'Test Agent',
      );
      expect(result.consent).toBeDefined();
    });
  });

  describe('bulkUpdateConsents', () => {
    it('should bulk update consents', async () => {
      const dto = {
        consents: [
          { type: ConsentType.MARKETING_EMAILS, granted: true },
          { type: ConsentType.ANALYTICS_TRACKING, granted: false },
        ],
      };
      mockPrivacyService.bulkUpdateConsents.mockResolvedValue([
        { ...mockConsent, type: ConsentType.MARKETING_EMAILS },
        { ...mockConsent, type: ConsentType.ANALYTICS_TRACKING, granted: false },
      ]);

      const result = await controller.bulkUpdateConsents(
        dto,
        mockUser as any,
        '127.0.0.1',
        'Test Agent',
      );

      expect(privacyService.bulkUpdateConsents).toHaveBeenCalledWith(
        'user-123',
        dto,
        '127.0.0.1',
        'Test Agent',
      );
      expect(result.consents).toHaveLength(2);
    });
  });

  describe('getConsentTypes', () => {
    it('should return all consent types', () => {
      const result = controller.getConsentTypes();

      expect(result.types).toHaveLength(8);
      expect(result.types[0].id).toBe(ConsentType.TERMS_OF_SERVICE);
      expect(result.types[0].required).toBe(true);
      expect(result.types[2].id).toBe(ConsentType.MARKETING_EMAILS);
      expect(result.types[2].required).toBe(false);
    });
  });

  describe('getDataRequests', () => {
    it('should return data requests history', async () => {
      mockPrivacyService.getDataRequests.mockResolvedValue([mockDataRequest]);

      const result = await controller.getDataRequests(mockUser as any);

      expect(privacyService.getDataRequests).toHaveBeenCalledWith('user-123');
      expect(result.requests).toHaveLength(1);
    });
  });

  describe('createDataRequest', () => {
    it('should create data request', async () => {
      const dto = { type: DataRequestType.EXPORT };
      mockPrivacyService.createDataRequest.mockResolvedValue(mockDataRequest);

      const result = await controller.createDataRequest(dto, mockUser as any, '127.0.0.1');

      expect(privacyService.createDataRequest).toHaveBeenCalledWith('user-123', dto, '127.0.0.1');
      expect(result.request).toBeDefined();
    });
  });

  describe('requestExport', () => {
    it('should request data export', async () => {
      mockPrivacyService.createDataRequest.mockResolvedValue(mockDataRequest);

      const result = await controller.requestExport(mockUser as any, '127.0.0.1');

      expect(privacyService.createDataRequest).toHaveBeenCalledWith(
        'user-123',
        { type: 'export' },
        '127.0.0.1',
      );
      expect(result.message).toContain('数据导出请求已提交');
      expect(result.requestId).toBe('request-123');
    });
  });

  describe('requestAccountDeletion', () => {
    it('should request account deletion', async () => {
      const deletionRequest = {
        ...mockDataRequest,
        type: DataRequestType.DELETE,
        coolingPeriodEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      mockPrivacyService.createDataRequest.mockResolvedValue(deletionRequest);

      const result = await controller.requestAccountDeletion(
        { reason: 'No longer needed' },
        mockUser as any,
        '127.0.0.1',
      );

      expect(privacyService.createDataRequest).toHaveBeenCalledWith(
        'user-123',
        { type: 'delete', reason: 'No longer needed' },
        '127.0.0.1',
      );
      expect(result.message).toContain('账户删除请求已提交');
      expect(result.scheduledDeletionDate).toBeDefined();
    });

    it('should request account deletion without reason', async () => {
      const deletionRequest = {
        ...mockDataRequest,
        type: DataRequestType.DELETE,
      };
      mockPrivacyService.createDataRequest.mockResolvedValue(deletionRequest);

      const result = await controller.requestAccountDeletion({}, mockUser as any, '127.0.0.1');

      expect(privacyService.createDataRequest).toHaveBeenCalledWith(
        'user-123',
        { type: 'delete', reason: undefined },
        '127.0.0.1',
      );
      expect(result.requestId).toBeDefined();
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should cancel account deletion request', async () => {
      mockPrivacyService.cancelDeletionRequest.mockResolvedValue(undefined);

      const result = await controller.cancelAccountDeletion('request-123', mockUser as any);

      expect(privacyService.cancelDeletionRequest).toHaveBeenCalledWith('user-123', 'request-123');
      expect(result.message).toBe('删除请求已取消');
    });
  });

  describe('getRights', () => {
    it('should return GDPR and CCPA rights', () => {
      const result = controller.getRights();

      expect(result.gdpr).toBeDefined();
      expect(result.gdpr.name).toContain('GDPR');
      expect(result.gdpr.rights).toHaveLength(6);

      expect(result.ccpa).toBeDefined();
      expect(result.ccpa.name).toContain('CCPA');
      expect(result.ccpa.rights).toHaveLength(4);
    });

    it('should include export action in GDPR rights', () => {
      const result = controller.getRights();

      const accessRight = result.gdpr.rights.find((r: any) => r.name === '访问权');
      expect(accessRight?.action).toBe('export');
    });
  });
});
