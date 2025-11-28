import { HttpClient } from './utils/http';
import { AuthModule } from './auth';
import { LinksModule } from './modules/links';
import { CampaignsModule } from './modules/campaigns';
import { QRModule } from './modules/qr';
import { AnalyticsModule } from './modules/analytics';
import { WebhooksModule } from './modules/webhooks';
import { TeamsModule } from './modules/teams';
import type { LnkClientConfig } from './types';

export class LnkClient {
  private http: HttpClient;

  public readonly auth: AuthModule;
  public readonly links: LinksModule;
  public readonly campaigns: CampaignsModule;
  public readonly qr: QRModule;
  public readonly analytics: AnalyticsModule;
  public readonly webhooks: WebhooksModule;
  public readonly teams: TeamsModule;

  constructor(config: LnkClientConfig = {}) {
    this.http = new HttpClient({
      baseUrl: config.baseUrl || 'https://api.lnk.day',
      apiKey: config.apiKey,
      accessToken: config.accessToken,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      onTokenRefresh: config.onTokenRefresh,
    });

    this.auth = new AuthModule(this.http);
    this.links = new LinksModule(this.http);
    this.campaigns = new CampaignsModule(this.http);
    this.qr = new QRModule(this.http);
    this.analytics = new AnalyticsModule(this.http);
    this.webhooks = new WebhooksModule(this.http);
    this.teams = new TeamsModule(this.http);
  }

  setAccessToken(token: string, refreshToken?: string, expiresAt?: number): void {
    this.http.setTokens(token, refreshToken, expiresAt);
  }

  clearAuth(): void {
    this.http.clearTokens();
  }

  static fromApiKey(apiKey: string, options?: Omit<LnkClientConfig, 'apiKey'>): LnkClient {
    return new LnkClient({ ...options, apiKey });
  }

  static fromAccessToken(
    accessToken: string,
    options?: Omit<LnkClientConfig, 'accessToken'>
  ): LnkClient {
    return new LnkClient({ ...options, accessToken });
  }
}
