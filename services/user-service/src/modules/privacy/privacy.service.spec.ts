import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrivacyService } from './privacy.service';
import { UserConsent, ConsentType } from './entities/user-consent.entity';
import { DataRequest, DataRequestType, DataRequestStatus } from './entities/data-request.entity';
import { User } from '../user/entities/user.entity';
import { TeamMember } from '../team/entities/team-member.entity';
import { EmailService } from '../email/email.service';
import { createMockRepository, createMockEmailService, createMockConfigService } from '../../../test/mocks';

describe('PrivacyService', () => {
  let service: PrivacyService;
  let consentRepository: ReturnType<typeof createMockRepository>;
  let dataRequestRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let teamMemberRepository: ReturnType<typeof createMockRepository>;
  let emailService: ReturnType<typeof createMockEmailService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
  };

  const mockConsent = {
    id: 'consent-123',
    userId: 'user-123',
    type: ConsentType.PRIVACY_POLICY,
    granted: true,
    grantedAt: new Date(),
    revokedAt: null,
    version: '1.0',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDataRequest = {
    id: 'request-123',
    userId: 'user-123',
    type: DataRequestType.EXPORT,
    status: DataRequestStatus.PENDING,
    reason: 'Personal backup',
    ipAddress: '127.0.0.1',
    coolingPeriodEndsAt: null,
    downloadUrl: null,
    downloadExpiresAt: null,
    completedAt: null,
    processingNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    consentRepository = createMockRepository();
    dataRequestRepository = createMockRepository();
    userRepository = createMockRepository();
    teamMemberRepository = createMockRepository();
    emailService = {
      ...createMockEmailService(),
      sendDataExportReadyEmail: jest.fn().mockResolvedValue(undefined),
      sendPrivacyRequestEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyService,
        {
          provide: getRepositoryToken(UserConsent),
          useValue: consentRepository,
        },
        {
          provide: getRepositoryToken(DataRequest),
          useValue: dataRequestRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: teamMemberRepository,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            PRIVACY_POLICY_VERSION: '1.0',
            FRONTEND_URL: 'http://localhost:60010',
          }),
        },
      ],
    }).compile();

    service = module.get<PrivacyService>(PrivacyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Cleanup intervals
    service.onModuleDestroy();
  });

  describe('getConsents', () => {
    it('should return user consents', async () => {
      consentRepository.find.mockResolvedValue([mockConsent]);

      const result = await service.getConsents('user-123');

      expect(consentRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { type: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateConsent', () => {
    it('should create new consent if not exists', async () => {
      consentRepository.findOne.mockResolvedValue(null);
      consentRepository.create.mockReturnValue({ ...mockConsent });
      consentRepository.save.mockResolvedValue({ ...mockConsent });

      const result = await service.updateConsent(
        'user-123',
        { type: ConsentType.PRIVACY_POLICY, granted: true },
        '127.0.0.1',
        'Test Agent',
      );

      expect(consentRepository.create).toHaveBeenCalled();
      expect(consentRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update existing consent', async () => {
      consentRepository.findOne.mockResolvedValue({ ...mockConsent });
      consentRepository.save.mockResolvedValue({ ...mockConsent, granted: false });

      const result = await service.updateConsent(
        'user-123',
        { type: ConsentType.PRIVACY_POLICY, granted: false },
        '127.0.0.1',
      );

      expect(consentRepository.create).not.toHaveBeenCalled();
      expect(consentRepository.save).toHaveBeenCalled();
    });

    it('should set grantedAt when granting consent', async () => {
      consentRepository.findOne.mockResolvedValue(null);
      consentRepository.create.mockReturnValue({ ...mockConsent });
      consentRepository.save.mockImplementation((consent) => Promise.resolve(consent));

      await service.updateConsent(
        'user-123',
        { type: ConsentType.MARKETING_EMAILS, granted: true },
      );

      expect(consentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ granted: true, grantedAt: expect.any(Date) }),
      );
    });

    it('should set revokedAt when revoking consent', async () => {
      consentRepository.findOne.mockResolvedValue({ ...mockConsent });
      consentRepository.save.mockImplementation((consent) => Promise.resolve(consent));

      await service.updateConsent(
        'user-123',
        { type: ConsentType.MARKETING_EMAILS, granted: false },
      );

      expect(consentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ granted: false, revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('bulkUpdateConsents', () => {
    it('should update multiple consents', async () => {
      consentRepository.findOne.mockResolvedValue(null);
      consentRepository.create.mockReturnValue({ ...mockConsent });
      consentRepository.save.mockResolvedValue({ ...mockConsent });

      const result = await service.bulkUpdateConsents('user-123', {
        consents: [
          { type: ConsentType.PRIVACY_POLICY, granted: true },
          { type: ConsentType.MARKETING_EMAILS, granted: false },
        ],
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('hasRequiredConsents', () => {
    it('should return true if all required consents granted', async () => {
      consentRepository.findOne.mockResolvedValue({ ...mockConsent, granted: true });

      const result = await service.hasRequiredConsents('user-123');

      expect(result).toBe(true);
    });

    it('should return false if any required consent missing', async () => {
      consentRepository.findOne
        .mockResolvedValueOnce({ ...mockConsent, granted: true })
        .mockResolvedValueOnce(null);

      const result = await service.hasRequiredConsents('user-123');

      expect(result).toBe(false);
    });
  });

  describe('createDataRequest', () => {
    it('should create export request', async () => {
      dataRequestRepository.findOne.mockResolvedValue(null);
      dataRequestRepository.create.mockReturnValue({ ...mockDataRequest });
      dataRequestRepository.save.mockResolvedValue({ ...mockDataRequest });
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.createDataRequest(
        'user-123',
        { type: DataRequestType.EXPORT, reason: 'Backup' },
        '127.0.0.1',
      );

      expect(dataRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: DataRequestType.EXPORT,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw if pending request of same type exists', async () => {
      dataRequestRepository.findOne.mockResolvedValue(mockDataRequest);

      await expect(
        service.createDataRequest('user-123', { type: DataRequestType.EXPORT }),
      ).rejects.toThrow(new BadRequestException('您已有一个待处理的相同类型请求'));
    });

    it('should set cooling period for deletion request', async () => {
      dataRequestRepository.findOne.mockResolvedValue(null);
      dataRequestRepository.create.mockReturnValue({
        ...mockDataRequest,
        type: DataRequestType.DELETE,
      });
      dataRequestRepository.save.mockImplementation((req) => Promise.resolve(req));
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.createDataRequest('user-123', { type: DataRequestType.DELETE });

      expect(dataRequestRepository.create).toHaveBeenCalled();
      const createCall = dataRequestRepository.create.mock.calls[0][0];
      expect(createCall.type).toBe(DataRequestType.DELETE);
    });
  });

  describe('getDataRequests', () => {
    it('should return user data requests', async () => {
      dataRequestRepository.find.mockResolvedValue([mockDataRequest]);

      const result = await service.getDataRequests('user-123');

      expect(dataRequestRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('cancelDeletionRequest', () => {
    it('should cancel pending deletion request', async () => {
      const deletionRequest = {
        ...mockDataRequest,
        type: DataRequestType.DELETE,
        status: DataRequestStatus.PENDING,
      };
      dataRequestRepository.findOne.mockResolvedValue(deletionRequest);
      dataRequestRepository.save.mockResolvedValue({
        ...deletionRequest,
        status: DataRequestStatus.CANCELLED,
      });

      await service.cancelDeletionRequest('user-123', 'request-123');

      expect(dataRequestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: DataRequestStatus.CANCELLED }),
      );
    });

    it('should throw if request not found', async () => {
      dataRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelDeletionRequest('user-123', 'request-123'),
      ).rejects.toThrow(new NotFoundException('删除请求不存在'));
    });

    it('should throw if request not pending', async () => {
      dataRequestRepository.findOne.mockResolvedValue({
        ...mockDataRequest,
        type: DataRequestType.DELETE,
        status: DataRequestStatus.PROCESSING,
      });

      await expect(
        service.cancelDeletionRequest('user-123', 'request-123'),
      ).rejects.toThrow(new BadRequestException('只能取消待处理的删除请求'));
    });
  });

  describe('collectUserData', () => {
    it('should collect user data for export', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.find.mockResolvedValue([
        { team: { id: 'team-1', name: 'Team 1' }, role: 'MEMBER' },
      ]);
      consentRepository.find.mockResolvedValue([mockConsent]);

      const result = await service.collectUserData('user-123');

      expect(result.user.id).toBe('user-123');
      expect(result.teams).toHaveLength(1);
      expect(result.consents).toHaveLength(1);
      expect(result.exportDate).toBeDefined();
    });

    it('should throw if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.collectUserData('user-123')).rejects.toThrow(
        new NotFoundException('用户不存在'),
      );
    });
  });

  describe('processAccountDeletion', () => {
    it('should throw if request not found', async () => {
      dataRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.processAccountDeletion('request-123')).rejects.toThrow(
        new NotFoundException('删除请求不存在'),
      );
    });

    it('should throw if request status is not pending', async () => {
      dataRequestRepository.findOne.mockResolvedValue({
        ...mockDataRequest,
        type: DataRequestType.DELETE,
        status: DataRequestStatus.PROCESSING,
      });

      await expect(service.processAccountDeletion('request-123')).rejects.toThrow(
        new BadRequestException('请求状态不正确'),
      );
    });

    it('should throw if cooling period not ended', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      dataRequestRepository.findOne.mockResolvedValue({
        ...mockDataRequest,
        type: DataRequestType.DELETE,
        status: DataRequestStatus.PENDING,
        coolingPeriodEndsAt: futureDate,
      });

      await expect(service.processAccountDeletion('request-123')).rejects.toThrow(
        new BadRequestException('冷静期尚未结束'),
      );
    });
  });

  describe('anonymizeUserData', () => {
    it('should anonymize user data', async () => {
      userRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      consentRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.anonymizeUserData('user-123');

      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        email: expect.stringMatching(/deleted-.+@anonymous\.local/),
        name: 'Deleted User',
        password: '',
      });
      expect(consentRepository.delete).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });

  describe('getPrivacyOverview', () => {
    it('should return privacy overview', async () => {
      consentRepository.find.mockResolvedValue([mockConsent]);
      dataRequestRepository.find.mockResolvedValue([mockDataRequest]);

      const result = await service.getPrivacyOverview('user-123');

      expect(result.consents).toHaveLength(1);
      expect(result.pendingRequests).toBeDefined();
    });

    it('should include scheduled deletion if pending', async () => {
      const deletionRequest = {
        ...mockDataRequest,
        type: DataRequestType.DELETE,
        status: DataRequestStatus.PENDING,
        coolingPeriodEndsAt: new Date(),
      };
      consentRepository.find.mockResolvedValue([]);
      dataRequestRepository.find.mockResolvedValue([deletionRequest]);

      const result = await service.getPrivacyOverview('user-123');

      expect(result.scheduledDeletion).toBeDefined();
      expect(result.scheduledDeletion?.requestId).toBe(deletionRequest.id);
    });
  });

  describe('processPendingDeletions', () => {
    it('should process pending deletions past cooling period', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      dataRequestRepository.find.mockResolvedValue([
        {
          ...mockDataRequest,
          id: 'deletion-1',
          type: DataRequestType.DELETE,
          status: DataRequestStatus.PENDING,
          coolingPeriodEndsAt: pastDate,
        },
      ]);
      dataRequestRepository.findOne.mockResolvedValue({
        ...mockDataRequest,
        type: DataRequestType.DELETE,
        status: DataRequestStatus.PENDING,
        coolingPeriodEndsAt: pastDate,
      });
      dataRequestRepository.save.mockResolvedValue({});
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      userRepository.delete.mockResolvedValue({ affected: 1, raw: {} });
      consentRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.processPendingDeletions();

      expect(dataRequestRepository.find).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredExports', () => {
    it('should cleanup expired export links', async () => {
      const expiredRequest = {
        ...mockDataRequest,
        type: DataRequestType.EXPORT,
        status: DataRequestStatus.COMPLETED,
        downloadUrl: 'http://example.com/download',
        downloadExpiresAt: new Date(Date.now() - 86400000),
      };
      dataRequestRepository.find.mockResolvedValue([expiredRequest]);
      dataRequestRepository.save.mockResolvedValue({});

      await service.cleanupExpiredExports();

      expect(dataRequestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ downloadUrl: null }),
      );
    });
  });
});
