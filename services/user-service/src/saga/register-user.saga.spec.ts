import { Test, TestingModule } from '@nestjs/testing';

import { RegisterUserSaga, RegisterUserSagaPayload } from './register-user.saga';

// Mock @lnk/nestjs-common
jest.mock('@lnk/nestjs-common', () => ({
  SagaOrchestrator: jest.fn().mockImplementation(() => ({
    registerSaga: jest.fn(),
    execute: jest.fn().mockResolvedValue({
      sagaId: 'saga-123',
      status: 'completed',
      results: {
        'create-user-account': { userId: 'user-123' },
        'init-quota': { quotaId: 'quota-user-123' },
        'create-default-team': { teamId: 'team-user-123' },
        'send-welcome-email': { sent: true },
      },
    }),
  })),
  SagaBuilder: {
    create: jest.fn().mockReturnValue({
      step: jest.fn().mockReturnThis(),
      withRetries: jest.fn().mockReturnThis(),
      withTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        type: 'register-user',
        steps: [],
      }),
    }),
  },
  createStepHandler: jest.fn((handler, compensator) => ({ handler, compensator })),
}));

import { SagaOrchestrator, SagaBuilder, createStepHandler } from '@lnk/nestjs-common';

describe('RegisterUserSaga', () => {
  let saga: RegisterUserSaga;
  let sagaOrchestrator: any;
  let sagaBuilder: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    sagaOrchestrator = {
      registerSaga: jest.fn(),
      execute: jest.fn().mockResolvedValue({
        sagaId: 'saga-123',
        status: 'completed',
        result: {
          'create-user-account': { userId: 'user-123' },
          'init-quota': { quotaId: 'quota-user-123' },
          'create-default-team': { teamId: 'team-user-123' },
          'send-welcome-email': { sent: true },
        },
      }),
    };

    sagaBuilder = {
      step: jest.fn().mockReturnThis(),
      withRetries: jest.fn().mockReturnThis(),
      withTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        type: 'register-user',
        steps: ['create-user-account', 'init-quota', 'create-default-team', 'send-welcome-email'],
      }),
    };

    (SagaBuilder.create as jest.Mock).mockReturnValue(sagaBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserSaga,
        {
          provide: SagaOrchestrator,
          useValue: sagaOrchestrator,
        },
      ],
    }).compile();

    saga = module.get<RegisterUserSaga>(RegisterUserSaga);
  });

  describe('onModuleInit', () => {
    it('should register saga on module init', () => {
      saga.onModuleInit();

      expect(SagaBuilder.create).toHaveBeenCalledWith('register-user');
      expect(sagaOrchestrator.registerSaga).toHaveBeenCalled();
    });

    it('should configure saga with 4 steps', () => {
      saga.onModuleInit();

      // Should call step() 4 times
      expect(sagaBuilder.step).toHaveBeenCalledTimes(4);
    });

    it('should configure step 1: create-user-account', () => {
      saga.onModuleInit();

      const firstStepCall = sagaBuilder.step.mock.calls[0];
      expect(firstStepCall[0]).toBe('create-user-account');
      expect(firstStepCall[1]).toBe('user-service');
    });

    it('should configure step 2: init-quota with retryable option', () => {
      saga.onModuleInit();

      const secondStepCall = sagaBuilder.step.mock.calls[1];
      expect(secondStepCall[0]).toBe('init-quota');
      expect(secondStepCall[1]).toBe('user-service');
      expect(secondStepCall[3]).toEqual({ retryable: true });
    });

    it('should configure step 3: create-default-team', () => {
      saga.onModuleInit();

      const thirdStepCall = sagaBuilder.step.mock.calls[2];
      expect(thirdStepCall[0]).toBe('create-default-team');
      expect(thirdStepCall[1]).toBe('user-service');
    });

    it('should configure step 4: send-welcome-email with retry options', () => {
      saga.onModuleInit();

      const fourthStepCall = sagaBuilder.step.mock.calls[3];
      expect(fourthStepCall[0]).toBe('send-welcome-email');
      expect(fourthStepCall[1]).toBe('notification-service');
      expect(fourthStepCall[3]).toEqual({ retryable: true, maxRetries: 2 });
    });

    it('should configure global retries', () => {
      saga.onModuleInit();

      expect(sagaBuilder.withRetries).toHaveBeenCalledWith(3);
    });

    it('should configure timeout', () => {
      saga.onModuleInit();

      expect(sagaBuilder.withTimeout).toHaveBeenCalledWith(60000);
    });
  });

  describe('execute', () => {
    const payload: RegisterUserSagaPayload = {
      email: 'test@example.com',
      password: 'securepassword',
      name: 'Test User',
      plan: 'pro',
      referralCode: 'REF123',
    };

    beforeEach(() => {
      saga.onModuleInit();
    });

    it('should execute saga with payload', async () => {
      const result = await saga.execute(payload);

      expect(sagaOrchestrator.execute).toHaveBeenCalledWith('register-user', payload);
      expect(result.status).toBe('completed');
    });

    it('should return saga execution result', async () => {
      const result = await saga.execute(payload);

      expect(result.sagaId).toBe('saga-123');
      expect(result.result?.['create-user-account']).toEqual({ userId: 'user-123' });
      expect(result.result?.['init-quota']).toEqual({ quotaId: 'quota-user-123' });
      expect(result.result?.['create-default-team']).toEqual({ teamId: 'team-user-123' });
      expect(result.result?.['send-welcome-email']).toEqual({ sent: true });
    });

    it('should handle failed saga execution', async () => {
      sagaOrchestrator.execute.mockResolvedValueOnce({
        sagaId: 'saga-456',
        status: 'failed',
        error: 'User creation failed',
        result: {
          'create-user-account': null,
        },
      });

      const result = await saga.execute(payload);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('User creation failed');
    });

    it('should handle compensation on failure', async () => {
      sagaOrchestrator.execute.mockResolvedValueOnce({
        sagaId: 'saga-789',
        status: 'compensated',
        error: 'Team creation failed',
        result: {
          'create-user-account': { userId: 'user-123' },
          'init-quota': { quotaId: 'quota-user-123' },
          'create-default-team': null,
        },
        compensatedSteps: ['init-quota', 'create-user-account'],
      });

      const result = await saga.execute(payload);

      expect(result.status).toBe('compensated');
      expect(result.compensatedSteps).toContain('create-user-account');
    });

    it('should handle minimal payload', async () => {
      const minimalPayload: RegisterUserSagaPayload = {
        email: 'minimal@example.com',
        password: 'password123',
      };

      const result = await saga.execute(minimalPayload);

      expect(sagaOrchestrator.execute).toHaveBeenCalledWith('register-user', minimalPayload);
      expect(result.status).toBe('completed');
    });

    it('should propagate orchestrator errors', async () => {
      sagaOrchestrator.execute.mockRejectedValueOnce(new Error('Orchestrator error'));

      await expect(saga.execute(payload)).rejects.toThrow('Orchestrator error');
    });
  });

  describe('step handlers', () => {
    beforeEach(() => {
      saga.onModuleInit();
    });

    it('should create step handlers with compensators', () => {
      // Each step should have a handler created
      expect(createStepHandler).toHaveBeenCalledTimes(4);

      // Each call should include both handler and compensator functions
      for (const call of (createStepHandler as jest.Mock).mock.calls) {
        expect(call[0]).toBeInstanceOf(Function); // handler
        expect(call[1]).toBeInstanceOf(Function); // compensator
      }
    });

    describe('create-user-account handler', () => {
      it('should execute handler and return userId', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[0];
        const handler = handlerCall[0];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: {} };

        const result = await handler(payload, ctx);

        expect(result).toHaveProperty('userId');
        expect(result.userId).toMatch(/^user_\d+$/);
      });

      it('should execute compensator when userId exists', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[0];
        const compensator = handlerCall[1];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: { 'create-user-account': { userId: 'user-123' } } };

        // Should not throw
        await expect(compensator(payload, ctx)).resolves.not.toThrow();
      });

      it('should handle compensator when no userId', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[0];
        const compensator = handlerCall[1];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: {} };

        // Should not throw
        await expect(compensator(payload, ctx)).resolves.not.toThrow();
      });
    });

    describe('init-quota handler', () => {
      it('should execute handler and return quotaId', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[1];
        const handler = handlerCall[0];

        const payload = { email: 'test@example.com', password: 'pass123', plan: 'pro' };
        const ctx = { previousResults: { 'create-user-account': { userId: 'user-123' } } };

        const result = await handler(payload, ctx);

        expect(result).toHaveProperty('quotaId');
        expect(result.quotaId).toBe('quota_user-123');
      });

      it('should execute compensator when quotaId exists', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[1];
        const compensator = handlerCall[1];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: { 'init-quota': { quotaId: 'quota-123' } } };

        await expect(compensator(payload, ctx)).resolves.not.toThrow();
      });

      it('should handle compensator when no quotaId', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[1];
        const compensator = handlerCall[1];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: {} };

        await expect(compensator(payload, ctx)).resolves.not.toThrow();
      });
    });

    describe('create-default-team handler', () => {
      it('should execute handler and return teamId', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[2];
        const handler = handlerCall[0];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: { 'create-user-account': { userId: 'user-456' } } };

        const result = await handler(payload, ctx);

        expect(result).toHaveProperty('teamId');
        expect(result.teamId).toBe('team_user-456');
      });

      it('should execute compensator when teamId exists', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[2];
        const compensator = handlerCall[1];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: { 'create-default-team': { teamId: 'team-123' } } };

        await expect(compensator(payload, ctx)).resolves.not.toThrow();
      });

      it('should handle compensator when no teamId', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[2];
        const compensator = handlerCall[1];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: {} };

        await expect(compensator(payload, ctx)).resolves.not.toThrow();
      });
    });

    describe('send-welcome-email handler', () => {
      it('should execute handler and return sent status', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[3];
        const handler = handlerCall[0];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: {} };

        const result = await handler(payload, ctx);

        expect(result).toEqual({ sent: true });
      });

      it('should execute compensator (no-op)', async () => {
        const handlerCall = (createStepHandler as jest.Mock).mock.calls[3];
        const compensator = handlerCall[1];

        const payload = { email: 'test@example.com', password: 'pass123' };
        const ctx = { previousResults: {} };

        // Compensator is no-op for email
        await expect(compensator(payload, ctx)).resolves.not.toThrow();
      });
    });
  });

  describe('saga type', () => {
    it('should use correct saga type identifier', () => {
      saga.onModuleInit();

      expect(SagaBuilder.create).toHaveBeenCalledWith('register-user');
    });
  });
});
