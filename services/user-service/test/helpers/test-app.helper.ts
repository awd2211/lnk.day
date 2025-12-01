import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole, UserStatus } from '../../src/modules/user/entities/user.entity';
import { Team, TeamPlan, TeamStatus } from '../../src/modules/team/entities/team.entity';
import { TeamMember, TeamMemberRole } from '../../src/modules/team/entities/team-member.entity';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface TestTeam {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

// Mock Email service
export const mockEmailService = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendSecurityAlertEmail: jest.fn().mockResolvedValue(undefined),
  sendTeamInvitationEmail: jest.fn().mockResolvedValue(undefined),
  sendInvitationAcceptedEmail: jest.fn().mockResolvedValue(undefined),
  sendRemovedFromTeamEmail: jest.fn().mockResolvedValue(undefined),
  sendRoleChangedEmail: jest.fn().mockResolvedValue(undefined),
  sendDataExportReadyEmail: jest.fn().mockResolvedValue(undefined),
  sendPrivacyRequestEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountDeletionWarningEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountDeletedEmail: jest.fn().mockResolvedValue(undefined),
};

// Mock TokenBlacklistService
export const mockTokenBlacklistService = {
  addToBlacklist: jest.fn().mockResolvedValue(undefined),
  isBlacklisted: jest.fn().mockResolvedValue(false),
  removeFromBlacklist: jest.fn().mockResolvedValue(undefined),
};

// Mock Redis
export const mockRedis = {
  ping: jest.fn().mockResolvedValue('PONG'),
  setex: jest.fn().mockResolvedValue('OK'),
  exists: jest.fn().mockResolvedValue(0),
  del: jest.fn().mockResolvedValue(1),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
};

// Mock UserEventService (RabbitMQ)
export const mockUserEventService = {
  emitUserCreated: jest.fn().mockResolvedValue(undefined),
  emitUserUpdated: jest.fn().mockResolvedValue(undefined),
  emitUserDeleted: jest.fn().mockResolvedValue(undefined),
  emitTeamCreated: jest.fn().mockResolvedValue(undefined),
  emitTeamUpdated: jest.fn().mockResolvedValue(undefined),
  emitTeamDeleted: jest.fn().mockResolvedValue(undefined),
};

// Mock HttpService
export const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

/**
 * 生成 JWT Token
 */
export function generateToken(
  jwtService: JwtService,
  user: { id: string; email: string },
  expiresIn = '1h',
): string {
  return jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      type: 'user',
    },
    { expiresIn },
  );
}

/**
 * 生成 Refresh Token
 */
export function generateRefreshToken(
  jwtService: JwtService,
  user: { id: string; email: string },
): string {
  return jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    },
    { expiresIn: '7d' },
  );
}

/**
 * 创建测试用户（直接在数据库中）
 */
export async function createTestUser(
  userRepository: Repository<User>,
  jwtService: JwtService,
  data: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
  },
): Promise<TestUser> {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = userRepository.create({
    email: data.email,
    name: data.name,
    password: hashedPassword,
    role: data.role || UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(), // 默认已验证
  });

  const savedUser = await userRepository.save(user);

  const accessToken = generateToken(jwtService, savedUser);
  const refreshToken = generateRefreshToken(jwtService, savedUser);

  return {
    id: savedUser.id,
    email: savedUser.email,
    password: data.password,
    name: savedUser.name,
    accessToken,
    refreshToken,
  };
}

/**
 * 创建测试团队
 */
export async function createTestTeam(
  teamRepository: Repository<Team>,
  memberRepository: Repository<TeamMember>,
  ownerId: string,
  data: {
    name: string;
    slug: string;
    plan?: TeamPlan;
  },
): Promise<TestTeam> {
  const team = teamRepository.create({
    name: data.name,
    slug: data.slug,
    ownerId,
    plan: data.plan || TeamPlan.FREE,
    status: TeamStatus.ACTIVE,
  });

  const savedTeam = await teamRepository.save(team);

  // 创建 owner 的团队成员关系
  const member = memberRepository.create({
    teamId: savedTeam.id,
    userId: ownerId,
    role: TeamMemberRole.OWNER,
    joinedAt: new Date(),
  });
  await memberRepository.save(member);

  return {
    id: savedTeam.id,
    name: savedTeam.name,
    slug: savedTeam.slug,
    ownerId,
  };
}

/**
 * 重置所有 mock
 */
export function resetMocks(): void {
  jest.clearAllMocks();
  mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
  mockRedis.exists.mockResolvedValue(0);
  mockRedis.get.mockResolvedValue(null);
}
