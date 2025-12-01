import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { CurrentUser } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  // Helper to get the factory function from a param decorator
  function getParamDecoratorFactory(decorator: Function) {
    class TestClass {
      testMethod(@decorator() value: any) {}
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'testMethod');
    return args[Object.keys(args)[0]].factory;
  }

  const createMockExecutionContext = (user: any): ExecutionContext => {
    const mockRequest = {
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
      getType: () => 'http',
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
    } as unknown as ExecutionContext;
  };

  describe('factory function', () => {
    it('should extract user from request', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const context = createMockExecutionContext(mockUser);
      const result = factory(null, context);

      expect(result).toEqual(mockUser);
    });

    it('should return undefined when no user in request', () => {
      const factory = getParamDecoratorFactory(CurrentUser);

      const context = createMockExecutionContext(undefined);
      const result = factory(null, context);

      expect(result).toBeUndefined();
    });

    it('should return null when user is null', () => {
      const factory = getParamDecoratorFactory(CurrentUser);

      const context = createMockExecutionContext(null);
      const result = factory(null, context);

      expect(result).toBeNull();
    });

    it('should handle user with various properties', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const mockUser = {
        id: 'user-456',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'SUPER_ADMIN',
        teamId: 'team-789',
        permissions: ['admin:users:view', 'admin:users:manage'],
        isConsoleAdmin: true,
      };

      const context = createMockExecutionContext(mockUser);
      const result = factory(null, context);

      expect(result).toEqual(mockUser);
      expect(result.id).toBe('user-456');
      expect(result.role).toBe('SUPER_ADMIN');
      expect(result.permissions).toContain('admin:users:view');
    });

    it('should ignore data parameter', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const mockUser = { id: 'user-123' };

      const context = createMockExecutionContext(mockUser);

      // Pass some data - it should be ignored
      const result = factory('someData', context);

      expect(result).toEqual(mockUser);
    });

    it('should handle minimal user object', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const mockUser = { sub: 'system', email: 'system@internal', role: 'INTERNAL' };

      const context = createMockExecutionContext(mockUser);
      const result = factory(null, context);

      expect(result).toEqual(mockUser);
    });
  });
});
