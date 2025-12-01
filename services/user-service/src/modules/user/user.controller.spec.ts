import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserStatus } from './entities/user.entity';
import { createMockConfigService } from '../../../test/mocks';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    changePassword: jest.fn(),
    checkPasswordStrength: jest.fn(),
    sendEmailVerification: jest.fn(),
    verifyEmail: jest.fn(),
    suspendUser: jest.fn(),
    unsuspendUser: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    status: UserStatus.ACTIVE,
    teamId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({ INTERNAL_API_KEY: 'test-api-key' }),
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should create a user', async () => {
      mockUserService.create.mockResolvedValue({ id: 'new-id', ...createUserDto });

      const result = await controller.create(createUserDto);

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toHaveProperty('id');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockUserService.findAll.mockResolvedValue([mockUser]);

      const result = await controller.findAll();

      expect(userService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getMe', () => {
    it('should return current user info', async () => {
      const currentUser = { id: 'user-123' } as any;
      mockUserService.findOne.mockResolvedValue(mockUser);

      const result = await controller.getMe(currentUser);

      expect(userService.findOne).toHaveBeenCalledWith('user-123');
      expect(result.id).toBe('user-123');
    });
  });

  describe('updateMe', () => {
    it('should update current user', async () => {
      const currentUser = { id: 'user-123' } as any;
      const updateDto = { name: 'Updated Name' };
      mockUserService.update.mockResolvedValue({ ...mockUser, ...updateDto });

      const result = await controller.updateMe(currentUser, updateDto);

      expect(userService.update).toHaveBeenCalledWith('user-123', updateDto);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-123');

      expect(userService.findOne).toHaveBeenCalledWith('user-123');
      expect(result.id).toBe('user-123');
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateDto = { name: 'Updated Name' };
      mockUserService.update.mockResolvedValue({ ...mockUser, ...updateDto });

      const result = await controller.update('user-123', updateDto);

      expect(userService.update).toHaveBeenCalledWith('user-123', updateDto);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUserService.remove.mockResolvedValue(undefined);

      await controller.remove('user-123');

      expect(userService.remove).toHaveBeenCalledWith('user-123');
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const currentUser = { id: 'user-123' };
      const changePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };
      mockUserService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(currentUser, changePasswordDto);

      expect(userService.changePassword).toHaveBeenCalledWith(
        'user-123',
        'oldPassword',
        'newPassword123',
      );
      expect(result.message).toBe('密码修改成功');
    });
  });

  describe('checkPasswordStrength', () => {
    it('should check password strength', () => {
      const expectedResult = {
        score: 80,
        level: 'strong',
        feedback: ['Good password'],
        requirements: [],
      };
      mockUserService.checkPasswordStrength.mockReturnValue(expectedResult);

      const result = controller.checkPasswordStrength({ password: 'StrongPass1!' });

      expect(userService.checkPasswordStrength).toHaveBeenCalledWith('StrongPass1!');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      const currentUser = { id: 'user-123' } as any;
      const expectedResult = { message: '验证邮件已发送，请检查您的邮箱' };
      mockUserService.sendEmailVerification.mockResolvedValue(expectedResult);

      const result = await controller.sendVerificationEmail(currentUser);

      expect(userService.sendEmailVerification).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with token', async () => {
      const expectedResult = { message: '邮箱验证成功' };
      mockUserService.verifyEmail.mockResolvedValue(expectedResult);

      const result = await controller.verifyEmail('valid-token');

      expect(userService.verifyEmail).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('internalValidateUser', () => {
    it('should validate and return user info', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);

      const result = await controller.internalValidateUser('user-123');

      expect(userService.findOne).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        teamId: mockUser.teamId,
      });
    });
  });

  describe('internalFindByEmail', () => {
    it('should return user by email', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      const result = await controller.internalFindByEmail('test@example.com');

      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result?.id).toBe('user-123');
    });

    it('should return null if user not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      const result = await controller.internalFindByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('internalSuspendUser', () => {
    it('should suspend a user', async () => {
      mockUserService.suspendUser.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      const result = await controller.internalSuspendUser('user-123', {
        reason: 'Violation',
      });

      expect(userService.suspendUser).toHaveBeenCalledWith('user-123', 'Violation');
      expect(result.success).toBe(true);
      expect(result.status).toBe(UserStatus.SUSPENDED);
    });
  });

  describe('internalUnsuspendUser', () => {
    it('should unsuspend a user', async () => {
      mockUserService.unsuspendUser.mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });

      const result = await controller.internalUnsuspendUser('user-123');

      expect(userService.unsuspendUser).toHaveBeenCalledWith('user-123');
      expect(result.success).toBe(true);
      expect(result.status).toBe(UserStatus.ACTIVE);
    });
  });
});
