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
import { TeamController } from '../src/modules/team/team.controller';
import { TeamService } from '../src/modules/team/team.service';
import { UserService } from '../src/modules/user/user.service';
import { EmailService } from '../src/modules/email/email.service';
import { AuthModule, Permission } from '@lnk/nestjs-common';
import { HttpModule } from '@nestjs/axios';
import {
  mockEmailService,
  createTestUser,
  createTestTeam,
  TestUser,
  TestTeam,
  resetMocks,
} from './helpers/test-app.helper';

describe('TeamController (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: Repository<User>;
  let teamRepository: Repository<Team>;
  let memberRepository: Repository<TeamMember>;
  let invitationRepository: Repository<TeamInvitation>;
  let roleRepository: Repository<CustomRole>;
  let jwtService: JwtService;
  let testUser: TestUser;
  let testTeam: TestTeam;
  let ownerToken: string;

  // Helper to generate tokens with team permissions
  const generateTeamToken = (
    user: { id: string; email: string },
    teamId: string,
    role: string = 'OWNER',
    permissions: string[] = [],
  ) => {
    return jwtService.sign({
      sub: user.id,
      email: user.email,
      type: 'user',
      scope: { level: 'team', teamId },
      role,
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
      controllers: [TeamController],
      providers: [
        TeamService,
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

    // 创建测试用户
    testUser = await createTestUser(userRepository, jwtService, {
      email: 'owner@example.com',
      name: 'Team Owner',
      password: 'password123',
    });

    // 创建测试团队
    testTeam = await createTestTeam(teamRepository, memberRepository, testUser.id, {
      name: 'Test Team',
      slug: 'test-team',
      plan: TeamPlan.GROWTH,
    });

    // 生成有 OWNER 权限的 token
    ownerToken = generateTeamToken(
      { id: testUser.id, email: testUser.email },
      testTeam.id,
      'OWNER',
      [
        Permission.TEAM_VIEW,
        Permission.TEAM_INVITE,
        Permission.TEAM_REMOVE,
        Permission.TEAM_ROLES_MANAGE,
      ],
    );
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

  describe('POST /teams', () => {
    it('should create a new team', async () => {
      // 使用个人 scope 的 token 来创建新团队
      const personalToken = jwtService.sign({
        sub: testUser.id,
        email: testUser.email,
        type: 'user',
        scope: { level: 'personal', teamId: testUser.id },
        role: 'OWNER',
        permissions: [],
      });

      const response = await request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${personalToken}`)
        .send({
          name: 'New Team',
          slug: 'new-team',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('New Team');
      expect(response.body.slug).toBe('new-team');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/teams')
        .send({
          name: 'New Team',
          slug: 'new-team',
        })
        .expect(401);
    });
  });

  describe('GET /teams/current', () => {
    it('should return current team for user', async () => {
      const response = await request(app.getHttpServer())
        .get('/teams/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // API 直接返回团队对象
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(testTeam.id);
      expect(response.body.name).toBe('Test Team');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/teams/current').expect(401);
    });
  });

  describe('GET /teams/:id', () => {
    it('should return team by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.id).toBe(testTeam.id);
      expect(response.body.name).toBe('Test Team');
    });

    it('should return 404 for non-existent team', async () => {
      await request(app.getHttpServer())
        .get('/teams/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  describe('GET /teams/:id/members', () => {
    it('should return team members', async () => {
      const response = await request(app.getHttpServer())
        .get(`/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('userId');
      expect(response.body[0]).toHaveProperty('role');
    });
  });

  describe('POST /teams/:id/members (invite)', () => {
    it('should invite a new member to team', async () => {
      // 先创建一个要被邀请的用户
      await createTestUser(userRepository, jwtService, {
        email: 'newmember@example.com',
        name: 'New Member',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post(`/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'newmember@example.com',
          role: 'MEMBER',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post(`/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'invalid-email',
          role: 'member',
        })
        .expect(400);
    });
  });

  describe('PATCH /teams/:id/members/:memberId', () => {
    let memberUser: TestUser;
    let memberId: string;

    beforeEach(async () => {
      // 创建一个成员用户
      memberUser = await createTestUser(userRepository, jwtService, {
        email: 'member@example.com',
        name: 'Team Member',
        password: 'password123',
      });

      // 将该用户添加为团队成员
      const member = memberRepository.create({
        teamId: testTeam.id,
        userId: memberUser.id,
        role: TeamMemberRole.MEMBER,
        joinedAt: new Date(),
      });
      const savedMember = await memberRepository.save(member);
      memberId = savedMember.id;
    });

    it('should update member role', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/teams/${testTeam.id}/members/${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: 'ADMIN',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('DELETE /teams/:id/members/:memberId', () => {
    let memberUser: TestUser;
    let memberId: string;

    beforeEach(async () => {
      // 创建一个成员用户
      memberUser = await createTestUser(userRepository, jwtService, {
        email: 'member-to-remove@example.com',
        name: 'Member to Remove',
        password: 'password123',
      });

      // 将该用户添加为团队成员
      const member = memberRepository.create({
        teamId: testTeam.id,
        userId: memberUser.id,
        role: TeamMemberRole.MEMBER,
        joinedAt: new Date(),
      });
      const savedMember = await memberRepository.save(member);
      memberId = savedMember.id;
    });

    it('should remove member from team', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/teams/${testTeam.id}/members/${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // 删除成功返回空对象
      expect(response.body).toBeDefined();
    });
  });

  describe('DELETE /teams/:id', () => {
    it('should delete team', async () => {
      // 创建一个新团队来删除
      const newTeam = await createTestTeam(teamRepository, memberRepository, testUser.id, {
        name: 'Team to Delete',
        slug: 'team-to-delete',
      });

      const deleteToken = generateTeamToken(
        { id: testUser.id, email: testUser.email },
        newTeam.id,
        'OWNER',
        [Permission.TEAM_REMOVE],
      );

      const response = await request(app.getHttpServer())
        .delete(`/teams/${newTeam.id}`)
        .set('Authorization', `Bearer ${deleteToken}`)
        .expect(200);

      // 删除成功返回空对象
      expect(response.body).toBeDefined();
    });
  });

  describe('PATCH /teams/:id/status', () => {
    it('should update team status to suspended', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/teams/${testTeam.id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'suspended',
        })
        .expect(200);

      expect(response.body.status).toBe('suspended');
    });

    it('should update team status to active', async () => {
      // 先设置为暂停
      await teamRepository.update(testTeam.id, { status: TeamStatus.SUSPENDED });

      const response = await request(app.getHttpServer())
        .patch(`/teams/${testTeam.id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'active',
        })
        .expect(200);

      expect(response.body.status).toBe('active');
    });
  });
});
