export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: TeamPlan;
  createdAt: Date;
  updatedAt: Date;
}

export enum TeamPlan {
  FREE = 'FREE',
  CORE = 'CORE',
  GROWTH = 'GROWTH',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: UserRole;
  joinedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
