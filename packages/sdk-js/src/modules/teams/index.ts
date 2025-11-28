import type { HttpClient } from '../../utils/http';
import type {
  Team,
  TeamMember,
  InviteParams,
  PaginationParams,
  PaginatedResponse,
} from '../../types';

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface TeamSettings {
  defaultLinkExpiration?: number;
  requirePassword?: boolean;
  allowCustomDomains?: boolean;
  webhooksEnabled?: boolean;
  brandingEnabled?: boolean;
  defaultUtmSource?: string;
  defaultUtmMedium?: string;
}

export interface TeamUsage {
  linksCreated: number;
  linksLimit: number;
  clicksThisMonth: number;
  apiCallsThisMonth: number;
  apiCallsLimit: number;
  storageUsed: number;
  storageLimit: number;
  teamMembers: number;
  teamMembersLimit: number;
}

export class TeamsModule {
  constructor(private http: HttpClient) {}

  async create(name: string, slug?: string): Promise<Team> {
    return this.http.post<Team>('/teams', { name, slug });
  }

  async get(teamId: string): Promise<Team> {
    return this.http.get<Team>(`/teams/${teamId}`);
  }

  async update(teamId: string, data: { name?: string; slug?: string }): Promise<Team> {
    return this.http.patch<Team>(`/teams/${teamId}`, data);
  }

  async delete(teamId: string): Promise<void> {
    await this.http.delete(`/teams/${teamId}`);
  }

  async list(pagination?: PaginationParams): Promise<PaginatedResponse<Team>> {
    return this.http.get<PaginatedResponse<Team>>('/teams', pagination);
  }

  async getMembers(
    teamId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<TeamMember>> {
    return this.http.get(`/teams/${teamId}/members`, pagination);
  }

  async getMember(teamId: string, memberId: string): Promise<TeamMember> {
    return this.http.get(`/teams/${teamId}/members/${memberId}`);
  }

  async updateMemberRole(
    teamId: string,
    memberId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<TeamMember> {
    return this.http.patch(`/teams/${teamId}/members/${memberId}`, { role });
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    await this.http.delete(`/teams/${teamId}/members/${memberId}`);
  }

  async invite(teamId: string, params: InviteParams): Promise<TeamInvitation> {
    return this.http.post(`/teams/${teamId}/invitations`, params);
  }

  async bulkInvite(
    teamId: string,
    invites: InviteParams[]
  ): Promise<{
    sent: TeamInvitation[];
    failed: Array<{ email: string; error: string }>;
  }> {
    return this.http.post(`/teams/${teamId}/invitations/bulk`, { invites });
  }

  async getInvitations(
    teamId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<TeamInvitation>> {
    return this.http.get(`/teams/${teamId}/invitations`, pagination);
  }

  async cancelInvitation(teamId: string, invitationId: string): Promise<void> {
    await this.http.delete(`/teams/${teamId}/invitations/${invitationId}`);
  }

  async resendInvitation(teamId: string, invitationId: string): Promise<TeamInvitation> {
    return this.http.post(`/teams/${teamId}/invitations/${invitationId}/resend`);
  }

  async acceptInvitation(token: string): Promise<{ team: Team; member: TeamMember }> {
    return this.http.post('/teams/invitations/accept', { token });
  }

  async getSettings(teamId: string): Promise<TeamSettings> {
    return this.http.get(`/teams/${teamId}/settings`);
  }

  async updateSettings(teamId: string, settings: Partial<TeamSettings>): Promise<TeamSettings> {
    return this.http.patch(`/teams/${teamId}/settings`, settings);
  }

  async getUsage(teamId: string): Promise<TeamUsage> {
    return this.http.get(`/teams/${teamId}/usage`);
  }

  async transferOwnership(teamId: string, newOwnerId: string): Promise<Team> {
    return this.http.post(`/teams/${teamId}/transfer-ownership`, {
      newOwnerId,
    });
  }

  async leave(teamId: string): Promise<void> {
    await this.http.post(`/teams/${teamId}/leave`);
  }

  async getApiKeys(teamId: string): Promise<Array<{
    id: string;
    name: string;
    prefix: string;
    lastUsedAt?: string;
    expiresAt?: string;
    createdAt: string;
  }>> {
    return this.http.get(`/teams/${teamId}/api-keys`);
  }

  async createApiKey(
    teamId: string,
    name: string,
    expiresAt?: string
  ): Promise<{
    id: string;
    name: string;
    key: string;
    prefix: string;
    expiresAt?: string;
  }> {
    return this.http.post(`/teams/${teamId}/api-keys`, { name, expiresAt });
  }

  async deleteApiKey(teamId: string, keyId: string): Promise<void> {
    await this.http.delete(`/teams/${teamId}/api-keys/${keyId}`);
  }
}
