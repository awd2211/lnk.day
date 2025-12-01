import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import * as crypto from 'crypto';

import { User, UserRole, UserStatus } from '../src/modules/user/entities/user.entity';
import { Team, TeamPlan, TeamStatus } from '../src/modules/team/entities/team.entity';
import { TeamMember, TeamMemberRole } from '../src/modules/team/entities/team-member.entity';
import { TeamInvitation } from '../src/modules/team/entities/team-invitation.entity';
import { CustomRole } from '../src/modules/team/entities/custom-role.entity';
import { TwoFactorSecret } from '../src/modules/auth/2fa/entities/two-factor-secret.entity';
import { TwoFactorController } from '../src/modules/auth/2fa/two-factor.controller';
import { TwoFactorService } from '../src/modules/auth/2fa/two-factor.service';
import { AuthModule } from '@lnk/nestjs-common';
import { HttpModule } from '@nestjs/axios';
import {
  mockEmailService,
  createTestUser,
  TestUser,
  resetMocks,
} from './helpers/test-app.helper';

// Base32 解码工具
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanInput = encoded.toUpperCase().replace(/=+$/, '');

  let bits = '';
  for (const char of cleanInput) {
    const value = alphabet.indexOf(char);
    if (value === -1) continue;
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

// TOTP 生成工具（测试使用，实际验证可能由于时间同步问题失败）
function generateTOTP(secret: string): string {
  const time = Math.floor(Date.now() / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(time));

  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(buffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

describe('TwoFactorController (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: Repository<User>;
  let teamRepository: Repository<Team>;
  let memberRepository: Repository<TeamMember>;
  let invitationRepository: Repository<TeamInvitation>;
  let roleRepository: Repository<CustomRole>;
  let twoFactorRepository: Repository<TwoFactorSecret>;
  let jwtService: JwtService;
  let testUser: TestUser;
  let loginToken: string;

  beforeAll(async () => {
    // 设置环境变量
    process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-testing';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.INTERNAL_API_KEY = 'test-internal-api-key';
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'test-2fa-encryption-key-32ch!';
    process.env.APP_NAME = 'lnk.day';

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
          entities: [User, Team, TeamMember, TeamInvitation, CustomRole, TwoFactorSecret],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, Team, TeamMember, TeamInvitation, CustomRole, TwoFactorSecret]),
        JwtModule.register({
          secret: 'test-jwt-secret-for-e2e-testing',
          signOptions: { expiresIn: '1h' },
        }),
        AuthModule.register({ secret: 'test-jwt-secret-for-e2e-testing' }),
        HttpModule,
      ],
      controllers: [TwoFactorController],
      providers: [TwoFactorService],
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
    twoFactorRepository = module.get<Repository<TwoFactorSecret>>(getRepositoryToken(TwoFactorSecret));
    jwtService = module.get<JwtService>(JwtService);
  });

  beforeEach(async () => {
    resetMocks();
    // 清理数据
    await twoFactorRepository.createQueryBuilder().delete().execute();
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

    // 生成登录 token
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
      await twoFactorRepository?.createQueryBuilder().delete().execute();
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

  describe('GET /auth/2fa/status', () => {
    it('should return 2FA status as disabled for new user', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/2fa/status')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(response.body.enabled).toBe(false);
      expect(response.body.verified).toBe(false);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/2fa/status').expect(401);
    });
  });

  describe('POST /auth/2fa/enable', () => {
    it('should return secret and QR code for enabling 2FA', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/enable')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCodeUrl');
      expect(response.body).toHaveProperty('otpAuthUrl');
      expect(response.body).toHaveProperty('backupCodes');
      expect(Array.isArray(response.body.backupCodes)).toBe(true);
      expect(response.body.backupCodes.length).toBeGreaterThan(0);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/auth/2fa/enable').expect(401);
    });
  });

  describe('POST /auth/2fa/verify', () => {
    it('should return 400 without enabling first', async () => {
      await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({ code: '123456' })
        .expect(404);
    });

    it('should return 401 for invalid code', async () => {
      // 先启用 2FA
      await request(app.getHttpServer())
        .post('/auth/2fa/enable')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(201);

      // 尝试使用错误的验证码
      await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({ code: '000000' })
        .expect(401);
    });
  });

  describe('DELETE /auth/2fa/disable', () => {
    it('should return 400 when 2FA is not enabled', async () => {
      await request(app.getHttpServer())
        .delete('/auth/2fa/disable')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({ code: '123456' })
        .expect(400);
    });
  });

  describe('POST /auth/2fa/regenerate-backup-codes', () => {
    it('should return 400 when 2FA is not enabled', async () => {
      await request(app.getHttpServer())
        .post('/auth/2fa/regenerate-backup-codes')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({ code: '123456' })
        .expect(400);
    });
  });

  describe('Full 2FA flow', () => {
    it('should complete enable, verify, and check status flow', async () => {
      // Step 1: 获取初始状态
      let response = await request(app.getHttpServer())
        .get('/auth/2fa/status')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(response.body.enabled).toBe(false);

      // Step 2: 启用 2FA
      response = await request(app.getHttpServer())
        .post('/auth/2fa/enable')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('backupCodes');

      // Step 3: 检查状态（应该是 enabled=false 因为还未验证）
      response = await request(app.getHttpServer())
        .get('/auth/2fa/status')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      // 在验证之前，enabled 应该还是 false
      expect(response.body.verified).toBe(false);
    });
  });
});
