import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Reflector } from '@nestjs/core';
import request from 'supertest';

import { User, UserRole, UserStatus } from '../src/modules/user/entities/user.entity';
import { Team, TeamPlan, TeamStatus } from '../src/modules/team/entities/team.entity';
import { TeamMember, TeamMemberRole } from '../src/modules/team/entities/team-member.entity';
import { TeamInvitation } from '../src/modules/team/entities/team-invitation.entity';
import { CustomRole } from '../src/modules/team/entities/custom-role.entity';
import { UserController } from '../src/modules/user/user.controller';
import { UserService } from '../src/modules/user/user.service';
import { EmailService } from '../src/modules/email/email.service';
import { AuthModule } from '@lnk/nestjs-common';
import { HttpModule } from '@nestjs/axios';
import {
  mockEmailService,
  createTestUser,
  TestUser,
  resetMocks,
} from './helpers/test-app.helper';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: Repository<User>;
  let teamRepository: Repository<Team>;
  let memberRepository: Repository<TeamMember>;
  let invitationRepository: Repository<TeamInvitation>;
  let roleRepository: Repository<CustomRole>;
  let jwtService: JwtService;
  let testUser: TestUser;
  let loginToken: string;

  beforeAll(async () => {
    // 设置环境变量
    process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-testing';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.INTERNAL_API_KEY = 'test-internal-api-key';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 60030,
          username: 'postgres',
          password: 'postgres',
          database: 'lnk_users_test',
          entities: [User, Team, TeamMember, TeamInvitation, CustomRole],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, Team, TeamMember, TeamInvitation, CustomRole]),
        JwtModule.register({
          secret: 'test-jwt-secret-for-e2e-testing',
          signOptions: { expiresIn: '1h' },
        }),
        AuthModule.register({ secret: 'test-jwt-secret-for-e2e-testing' }),
        HttpModule,
      ],
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    await app.init();

    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    teamRepository = module.get<Repository<Team>>(getRepositoryToken(Team));
    memberRepository = module.get<Repository<TeamMember>>(getRepositoryToken(TeamMember));
    invitationRepository = module.get<Repository<TeamInvitation>>(getRepositoryToken(TeamInvitation));
    roleRepository = module.get<Repository<CustomRole>>(getRepositoryToken(CustomRole));
    jwtService = module.get<JwtService>(JwtService);
  });

  beforeEach(async () => {
    resetMocks();
    // 清理数据
    await invitationRepository.createQueryBuilder().delete().execute();
    await roleRepository.createQueryBuilder().delete().execute();
    await memberRepository.createQueryBuilder().delete().execute();
    await teamRepository.createQueryBuilder().delete().execute();
    await userRepository.createQueryBuilder().delete().execute();

    // 创建测试用户并获取登录 token
    testUser = await createTestUser(userRepository, jwtService, {
      email: 'testuser@example.com',
      name: 'Test User',
      password: 'password123',
    });

    // 生成有效的登录 token
    loginToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      type: 'user',
      scope: { level: 'personal', teamId: testUser.id },
      role: 'OWNER',
      permissions: ['settings:view', 'settings:edit'],
    });
  });

  afterAll(async () => {
    try {
      await invitationRepository?.createQueryBuilder().delete().execute();
      await roleRepository?.createQueryBuilder().delete().execute();
      await memberRepository?.createQueryBuilder().delete().execute();
      await teamRepository?.createQueryBuilder().delete().execute();
      await userRepository?.createQueryBuilder().delete().execute();
      const dataSource = module.get<DataSource>(DataSource);
      if (dataSource?.isInitialized) {
        await dataSource.destroy();
      }
      await app?.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('GET /users/me', () => {
    it('should return current user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe('testuser@example.com');
      expect(response.body.name).toBe('Test User');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('PUT /users/me', () => {
    it('should update current user profile', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.email).toBe('testuser@example.com');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .put('/users/me')
        .send({ name: 'Updated Name' })
        .expect(401);
    });
  });

  describe('POST /users/change-password', () => {
    it('should change password with correct current password', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newPassword456',
        })
        .expect(200);

      expect(response.body.message).toBe('密码修改成功');
    });

    it('should return 400 for incorrect current password', async () => {
      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword456',
        })
        .expect(400);
    });

    it('should return 400 if new password same as current', async () => {
      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'password123',
        })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/users/change-password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newPassword456',
        })
        .expect(401);
    });
  });

  describe('POST /users/check-password-strength', () => {
    it('should return password strength info', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/check-password-strength')
        .send({
          password: 'MyStr0ng!Password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('level');
      expect(response.body).toHaveProperty('feedback');
      expect(response.body).toHaveProperty('requirements');
    });

    it('should return low score for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/check-password-strength')
        .send({
          password: '123456',
        })
        .expect(200);

      expect(response.body.score).toBeLessThanOrEqual(50);
      expect(response.body.level).toMatch(/weak|fair/i);
    });
  });

  describe('POST /users/send-verification-email', () => {
    it('should send verification email for unverified user', async () => {
      // 创建未验证邮箱的用户
      const unverifiedUser = await createTestUser(userRepository, jwtService, {
        email: 'unverified@example.com',
        name: 'Unverified User',
        password: 'password123',
      });
      // 清除邮箱验证时间
      await userRepository.update(unverifiedUser.id, { emailVerifiedAt: null });

      const unverifiedToken = jwtService.sign({
        sub: unverifiedUser.id,
        email: unverifiedUser.email,
        type: 'user',
        scope: { level: 'personal', teamId: unverifiedUser.id },
        role: 'OWNER',
        permissions: [],
      });

      const response = await request(app.getHttpServer())
        .post('/users/send-verification-email')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/验证|verification/i);
      expect(mockEmailService.sendEmailVerificationEmail).toHaveBeenCalled();
    });

    it('should return 400 for already verified user', async () => {
      // testUser 的邮箱默认已验证
      await request(app.getHttpServer())
        .post('/users/send-verification-email')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(400);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe('testuser@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(404);
    });
  });

  describe('Internal API', () => {
    const internalApiKey = 'test-internal-api-key';

    it('should validate user via internal API', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/internal/validate/${testUser.id}`)
        .set('x-internal-api-key', internalApiKey)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe('testuser@example.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should find user by email via internal API', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/internal/by-email/testuser@example.com')
        .set('x-internal-api-key', internalApiKey)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe('testuser@example.com');
    });

    it('should return 401 without internal API key', async () => {
      await request(app.getHttpServer())
        .get(`/users/internal/validate/${testUser.id}`)
        .expect(401);
    });
  });
});
