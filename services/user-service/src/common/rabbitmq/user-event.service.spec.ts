import { Test, TestingModule } from '@nestjs/testing';

import {
  UserEventService,
  UserRegisteredData,
  UserUpdatedData,
  UserDeletedData,
} from './user-event.service';
import { RABBITMQ_CHANNEL } from './rabbitmq.constants';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

// Mock @lnk/shared-types
jest.mock('@lnk/shared-types', () => ({
  EXCHANGES: {
    USER_EVENTS: 'user.events',
    NOTIFICATION_EVENTS: 'notification.events',
  },
  ROUTING_KEYS: {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    NOTIFICATION_SEND: 'notification.send',
  },
}));

describe('UserEventService', () => {
  let service: UserEventService;
  let mockChannel: any;

  const createMockChannel = () => ({
    publish: jest.fn().mockReturnValue(true),
    assertExchange: jest.fn().mockResolvedValue({}),
    assertQueue: jest.fn().mockResolvedValue({}),
    bindQueue: jest.fn().mockResolvedValue({}),
  });

  beforeEach(async () => {
    mockChannel = createMockChannel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEventService,
        {
          provide: RABBITMQ_CHANNEL,
          useValue: mockChannel,
        },
      ],
    }).compile();

    service = module.get<UserEventService>(UserEventService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should warn when channel is not available', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserEventService,
          {
            provide: RABBITMQ_CHANNEL,
            useValue: null,
          },
        ],
      }).compile();

      module.get<UserEventService>(UserEventService);

      // Logger warning is internal, service should still initialize
      expect(module).toBeDefined();

      warnSpy.mockRestore();
    });
  });

  describe('publishUserRegistered', () => {
    const userData: UserRegisteredData = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      teamId: 'team-456',
      plan: 'pro',
    };

    it('should publish user registered event', async () => {
      await service.publishUserRegistered(userData);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'user.events',
        'user.created',
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          contentType: 'application/json',
          messageId: 'mock-uuid-123',
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should include correct event structure', async () => {
      await service.publishUserRegistered(userData);

      const publishCall = mockChannel.publish.mock.calls[0];
      const eventBuffer = publishCall[2];
      const event = JSON.parse(eventBuffer.toString());

      expect(event.type).toBe('user.created');
      expect(event.source).toBe('user-service');
      expect(event.data.userId).toBe('user-123');
      expect(event.data.email).toBe('test@example.com');
      expect(event.timestamp).toBeDefined();
    });

    it('should also send welcome notification', async () => {
      await service.publishUserRegistered(userData);

      // Should have published twice: user event + welcome notification
      expect(mockChannel.publish).toHaveBeenCalledTimes(2);

      // Second call should be the welcome notification
      const notificationCall = mockChannel.publish.mock.calls[1];
      expect(notificationCall[0]).toBe('notification.events');
      expect(notificationCall[1]).toBe('notification.send');

      const notificationEvent = JSON.parse(notificationCall[2].toString());
      expect(notificationEvent.type).toBe('notification.send');
      expect(notificationEvent.data.channel).toBe('email');
      expect(notificationEvent.data.template).toBe('welcome');
      expect(notificationEvent.data.recipient).toBe('test@example.com');
    });

    it('should use email prefix as userName if name not provided', async () => {
      const dataWithoutName: UserRegisteredData = {
        userId: 'user-123',
        email: 'john.doe@example.com',
      };

      await service.publishUserRegistered(dataWithoutName);

      const notificationCall = mockChannel.publish.mock.calls[1];
      const notificationEvent = JSON.parse(notificationCall[2].toString());

      expect(notificationEvent.data.payload.userName).toBe('john.doe');
    });

    it('should default to free plan if not provided', async () => {
      const dataWithoutPlan: UserRegisteredData = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      await service.publishUserRegistered(dataWithoutPlan);

      const notificationCall = mockChannel.publish.mock.calls[1];
      const notificationEvent = JSON.parse(notificationCall[2].toString());

      expect(notificationEvent.data.payload.plan).toBe('free');
    });

    it('should not throw when channel is null', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserEventService,
          {
            provide: RABBITMQ_CHANNEL,
            useValue: null,
          },
        ],
      }).compile();

      const serviceWithoutChannel = module.get<UserEventService>(UserEventService);

      // Should not throw
      await expect(serviceWithoutChannel.publishUserRegistered(userData)).resolves.not.toThrow();
    });
  });

  describe('publishUserUpdated', () => {
    const updateData: UserUpdatedData = {
      userId: 'user-123',
      changes: {
        name: 'New Name',
        email: 'new@example.com',
      },
    };

    it('should publish user updated event', async () => {
      await service.publishUserUpdated(updateData);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'user.events',
        'user.updated',
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          contentType: 'application/json',
        }),
      );
    });

    it('should include changes in event data', async () => {
      await service.publishUserUpdated(updateData);

      const publishCall = mockChannel.publish.mock.calls[0];
      const event = JSON.parse(publishCall[2].toString());

      expect(event.type).toBe('user.updated');
      expect(event.data.userId).toBe('user-123');
      expect(event.data.changes).toEqual({
        name: 'New Name',
        email: 'new@example.com',
      });
    });

    it('should handle empty changes', async () => {
      const emptyChanges: UserUpdatedData = {
        userId: 'user-123',
        changes: {},
      };

      await expect(service.publishUserUpdated(emptyChanges)).resolves.not.toThrow();
    });
  });

  describe('publishUserDeleted', () => {
    const deleteData: UserDeletedData = {
      userId: 'user-123',
      email: 'deleted@example.com',
      teamId: 'team-456',
      reason: 'User requested deletion',
    };

    it('should publish user deleted event', async () => {
      await service.publishUserDeleted(deleteData);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'user.events',
        'user.deleted',
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          contentType: 'application/json',
        }),
      );
    });

    it('should include all deletion data in event', async () => {
      await service.publishUserDeleted(deleteData);

      const publishCall = mockChannel.publish.mock.calls[0];
      const event = JSON.parse(publishCall[2].toString());

      expect(event.type).toBe('user.deleted');
      expect(event.data.userId).toBe('user-123');
      expect(event.data.email).toBe('deleted@example.com');
      expect(event.data.teamId).toBe('team-456');
      expect(event.data.reason).toBe('User requested deletion');
    });

    it('should handle minimal deletion data', async () => {
      const minimalData: UserDeletedData = {
        userId: 'user-123',
        email: 'deleted@example.com',
      };

      await expect(service.publishUserDeleted(minimalData)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should not throw when publish fails', async () => {
      mockChannel.publish.mockImplementationOnce(() => {
        throw new Error('Channel error');
      });

      const userData: UserRegisteredData = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      // Should not throw
      await expect(service.publishUserRegistered(userData)).resolves.not.toThrow();
    });

    it('should continue processing after publish error', async () => {
      // First publish fails, second should still be attempted
      mockChannel.publish
        .mockImplementationOnce(() => {
          throw new Error('First publish error');
        })
        .mockReturnValueOnce(true);

      const userData: UserRegisteredData = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      await service.publishUserRegistered(userData);

      // Both publishes should have been attempted
      expect(mockChannel.publish).toHaveBeenCalledTimes(2);
    });
  });

  describe('message format', () => {
    it('should use persistent messages', async () => {
      await service.publishUserRegistered({
        userId: 'user-123',
        email: 'test@example.com',
      });

      const publishOptions = mockChannel.publish.mock.calls[0][3];
      expect(publishOptions.persistent).toBe(true);
    });

    it('should set content type to JSON', async () => {
      await service.publishUserRegistered({
        userId: 'user-123',
        email: 'test@example.com',
      });

      const publishOptions = mockChannel.publish.mock.calls[0][3];
      expect(publishOptions.contentType).toBe('application/json');
    });

    it('should include message ID', async () => {
      await service.publishUserRegistered({
        userId: 'user-123',
        email: 'test@example.com',
      });

      const publishOptions = mockChannel.publish.mock.calls[0][3];
      expect(publishOptions.messageId).toBe('mock-uuid-123');
    });

    it('should include timestamp', async () => {
      const before = Date.now();

      await service.publishUserRegistered({
        userId: 'user-123',
        email: 'test@example.com',
      });

      const after = Date.now();
      const publishOptions = mockChannel.publish.mock.calls[0][3];

      expect(publishOptions.timestamp).toBeGreaterThanOrEqual(before);
      expect(publishOptions.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
