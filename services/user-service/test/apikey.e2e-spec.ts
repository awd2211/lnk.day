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
import { ApiKey, ApiKeyScope } from '../src/modules/apikey/apikey.entity';
import { ApiKeyController } from '../src/modules/apikey/apikey.controller';
import { ApiKeyService } from '../src/modules/apikey/apikey.service';
import { AuthModule, Permission } from '@lnk/nestjs-common';
import { HttpModule } from '@nestjs/axios';
import {
  createTestUser,
  createTestTeam,
  TestUser,
  TestTeam,
  resetMocks,
} from './helpers/test-app.helper';

describe('ApiKeyController (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: Repository<User>;
  let teamRepository: Repository<Team>;
  let memberRepository: Repository<TeamMember>;
  let invitationRepository: Repository<TeamInvitation>;
  let roleRepository: Repository<CustomRole>;
  let apiKeyRepository: Repository<ApiKey>;
  let apiKeyService: ApiKeyService;
  let jwtService: JwtService;
  let testUser: TestUser;
  let testTeam: TestTeam;
  let userToken: string;

  const generateToken = (
    user: { id: string; email: string },
    teamId: string,
    permissions: string[] = [],
  ) => {
    return jwtService.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      type: 'user',
      scope: { level: 'personal', teamId },
      role: 'OWNER',
      permissions,
    });
  };

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
          entities: [User, Team, TeamMember, TeamInvitation, CustomRole, ApiKey],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, Team, TeamMember, TeamInvitation, CustomRole, ApiKey]),
        JwtModule.register({
          secret: 'test-jwt-secret-for-e2e-testing',
          signOptions: { expiresIn: '1h' },
        }),
        AuthModule.register({ secret: 'test-jwt-secret-for-e2e-testing' }),
        HttpModule,
      ],
      controllers: [ApiKeyController],
      providers: [ApiKeyService],
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
    apiKeyRepository = module.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));
    apiKeyService = module.get<ApiKeyService>(ApiKeyService);
    jwtService = module.get<JwtService>(JwtService);
  });

  beforeEach(async () => {
    resetMocks();
    // 清理数据
    await apiKeyRepository.createQueryBuilder().delete().execute();
    await invitationRepository.createQueryBuilder().delete().execute();
    await roleRepository.createQueryBuilder().delete().execute();
    await memberRepository.createQueryBuilder().delete().execute();
    await teamRepository.createQueryBuilder().delete().execute();
    await userRepository.createQueryBuilder().delete().execute();

    // 创建测试用户
    testUser = await createTestUser(userRepository, jwtService, {
      email: 'testuser@example.com',
      name: 'Test User',
      password: 'password123',
    });

    // 创建测试团队
    testTeam = await createTestTeam(teamRepository, memberRepository, testUser.id, {
      name: 'Test Team',
      slug: 'test-team',
    });

    // 生成有 API 密钥权限的 token
    userToken = generateToken(
      { id: testUser.id, email: testUser.email },
      testUser.id,
      [Permission.API_KEYS_VIEW, Permission.API_KEYS_MANAGE],
    );
  });

  afterAll(async () => {
    try {
      await apiKeyRepository?.createQueryBuilder().delete().execute();
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

  describe('ApiKeyService (direct tests)', () => {
    it('should create API key via service', async () => {
      const { apiKey, plainKey } = await apiKeyService.create(
        'Test Key',
        testUser.id,
        testUser.id,
        { scopes: [ApiKeyScope.READ] },
      );

      expect(apiKey.id).toBeDefined();
      expect(apiKey.name).toBe('Test Key');
      expect(plainKey).toMatch(/^lnk_/);
    });

    it('should find all API keys for team', async () => {
      await apiKeyService.create('Key 1', testUser.id, testUser.id);
      await apiKeyService.create('Key 2', testUser.id, testUser.id);

      const keys = await apiKeyService.findAll(testUser.id);
      expect(keys.length).toBe(2);
    });

    it('should find API key by id', async () => {
      const { apiKey } = await apiKeyService.create('Test Key', testUser.id, testUser.id);

      const found = await apiKeyService.findOne(apiKey.id);
      expect(found.id).toBe(apiKey.id);
      expect(found.name).toBe('Test Key');
    });

    it('should update API key', async () => {
      const { apiKey } = await apiKeyService.create('Test Key', testUser.id, testUser.id);

      const updated = await apiKeyService.update(apiKey.id, { name: 'Updated Key' });
      expect(updated.name).toBe('Updated Key');
    });

    it('should revoke API key', async () => {
      const { apiKey } = await apiKeyService.create('Test Key', testUser.id, testUser.id);

      const revoked = await apiKeyService.revoke(apiKey.id);
      expect(revoked.isActive).toBe(false);
    });

    it('should regenerate API key', async () => {
      const { apiKey: original, plainKey: originalPlainKey } = await apiKeyService.create(
        'Test Key',
        testUser.id,
        testUser.id,
      );

      const { apiKey: regenerated, plainKey: newPlainKey } = await apiKeyService.regenerate(
        original.id,
      );

      expect(regenerated.id).toBe(original.id);
      expect(newPlainKey).not.toBe(originalPlainKey);
      expect(newPlainKey).toMatch(/^lnk_/);
    });

    it('should delete API key', async () => {
      const { apiKey } = await apiKeyService.create('Test Key', testUser.id, testUser.id);

      await apiKeyService.delete(apiKey.id);

      // 验证已删除
      await expect(apiKeyService.findOne(apiKey.id)).rejects.toThrow();
    });

    it('should validate API key', async () => {
      const { plainKey } = await apiKeyService.create('Test Key', testUser.id, testUser.id);

      const validated = await apiKeyService.validateKey(plainKey);
      expect(validated).toBeDefined();
      expect(validated?.name).toBe('Test Key');
    });

    it('should reject invalid API key', async () => {
      await expect(apiKeyService.validateKey('lnk_invalid_key_12345')).rejects.toThrow(
        'Invalid API key',
      );
    });
  });

  describe('GET /api-keys (API endpoint)', () => {
    beforeEach(async () => {
      // 创建一些测试 API 密钥
      await apiKeyService.create('Test Key 1', testUser.id, testUser.id);
      await apiKeyService.create('Test Key 2', testUser.id, testUser.id);
    });

    it('should return list of API keys', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('keys');
      expect(Array.isArray(response.body.keys)).toBe(true);
      expect(response.body.keys.length).toBe(2);
      // 密钥不应该被返回
      expect(response.body.keys[0]).not.toHaveProperty('key');
      expect(response.body.keys[0]).toHaveProperty('keyPrefix');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api-keys').expect(401);
    });
  });

  describe('GET /api-keys/scopes/list', () => {
    it('should return list of available scopes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-keys/scopes/list')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('scopes');
      expect(Array.isArray(response.body.scopes)).toBe(true);
      expect(response.body.scopes.length).toBeGreaterThan(0);
      expect(response.body.scopes[0]).toHaveProperty('id');
      expect(response.body.scopes[0]).toHaveProperty('name');
    });
  });

  describe('GET /api-keys/:id', () => {
    it('should return 404 for non-existent API key', async () => {
      await request(app.getHttpServer())
        .get('/api-keys/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });
});
