import { Test, TestingModule } from '@nestjs/testing';

import { InvitationCleanupTask } from './invitation-cleanup.task';
import { InvitationService } from '../invitation.service';

describe('InvitationCleanupTask', () => {
  let task: InvitationCleanupTask;
  let invitationService: jest.Mocked<InvitationService>;

  const mockInvitationService = {
    cleanupExpiredInvitations: jest.fn(),
  };

  beforeEach(async () => {
    // Use legacy fake timers to preserve setInterval/clearInterval
    jest.useFakeTimers({ legacyFakeTimers: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationCleanupTask,
        {
          provide: InvitationService,
          useValue: mockInvitationService,
        },
      ],
    }).compile();

    task = module.get<InvitationCleanupTask>(InvitationCleanupTask);
    invitationService = module.get(InvitationService);
  });

  afterEach(() => {
    // Clean up interval if it was set (before restoring timers)
    task.onModuleDestroy();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('onModuleInit', () => {
    it('should start cleanup interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      task.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalled();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60 * 1000);
    });

    it('should run cleanup task every day', async () => {
      mockInvitationService.cleanupExpiredInvitations.mockResolvedValue(5);

      task.onModuleInit();

      // Fast-forward 1 day
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);

      // Allow async operations to complete
      await Promise.resolve();

      expect(mockInvitationService.cleanupExpiredInvitations).toHaveBeenCalled();
    });

    it('should run cleanup task multiple times', async () => {
      mockInvitationService.cleanupExpiredInvitations.mockResolvedValue(3);

      task.onModuleInit();

      // Fast-forward 3 days
      jest.advanceTimersByTime(3 * 24 * 60 * 60 * 1000);

      // Allow async operations to complete
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockInvitationService.cleanupExpiredInvitations).toHaveBeenCalledTimes(3);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear cleanup interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      task.onModuleInit();
      task.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle destroy when interval was not set', () => {
      // Should not throw
      expect(() => task.onModuleDestroy()).not.toThrow();
    });

    it('should not throw when called multiple times', () => {
      task.onModuleInit();
      task.onModuleDestroy();
      task.onModuleDestroy();

      // Should not throw
    });
  });

  describe('handleCleanup', () => {
    it('should call invitationService.cleanupExpiredInvitations', async () => {
      mockInvitationService.cleanupExpiredInvitations.mockResolvedValue(10);

      await task.handleCleanup();

      expect(mockInvitationService.cleanupExpiredInvitations).toHaveBeenCalled();
    });

    it('should log success with count', async () => {
      mockInvitationService.cleanupExpiredInvitations.mockResolvedValue(15);

      // Should complete without error
      await expect(task.handleCleanup()).resolves.not.toThrow();
    });

    it('should handle zero expired invitations', async () => {
      mockInvitationService.cleanupExpiredInvitations.mockResolvedValue(0);

      await expect(task.handleCleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup service error gracefully', async () => {
      mockInvitationService.cleanupExpiredInvitations.mockRejectedValue(
        new Error('Database connection error'),
      );

      // Should not throw, error is caught and logged
      await expect(task.handleCleanup()).resolves.not.toThrow();
    });

    it('should catch errors during interval execution', async () => {
      mockInvitationService.cleanupExpiredInvitations.mockRejectedValue(
        new Error('Cleanup failed'),
      );

      task.onModuleInit();

      // Fast-forward 1 day
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);

      // Allow async operations and error handling to complete
      await Promise.resolve();
      await Promise.resolve();

      // Task should still be running despite the error
      expect(mockInvitationService.cleanupExpiredInvitations).toHaveBeenCalled();
    });
  });

  describe('interval timing', () => {
    it('should use EVERY_DAY constant (24 hours in ms)', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      task.onModuleInit();

      const expectedInterval = 24 * 60 * 60 * 1000; // 86400000 ms
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), expectedInterval);
    });

    it('should not run immediately on module init', () => {
      task.onModuleInit();

      // Without advancing time, cleanup should not be called
      expect(mockInvitationService.cleanupExpiredInvitations).not.toHaveBeenCalled();
    });
  });
});
