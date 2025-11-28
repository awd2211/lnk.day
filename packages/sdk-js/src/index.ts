// Main client
export { LnkClient } from './client';

// Types
export type {
  // Common
  PaginationParams,
  PaginatedResponse,
  ApiError,
  LnkClientConfig,
  AuthTokens,

  // Links
  Link,
  CreateLinkParams,
  UpdateLinkParams,
  LinkFilter,

  // Campaigns
  Campaign,
  CreateCampaignParams,
  UpdateCampaignParams,

  // QR Codes
  QRCode,
  CreateQRCodeParams,
  QRCodeStyle,

  // Analytics
  AnalyticsSummary,
  ClickEvent,
  TimeSeriesData,
  AnalyticsQuery,

  // Teams
  Team,
  TeamMember,
  InviteParams,

  // Webhooks
  Webhook,
  WebhookEvent,
  CreateWebhookParams,
  UpdateWebhookParams,
} from './types';

// Auth types
export type { LoginParams, RegisterParams, User } from './auth';

// Module types
export type { CampaignFilter, CampaignGoal, CampaignAnalytics } from './modules/campaigns';
export type { QRCodeFilter } from './modules/qr';
export type { RealtimeData, GeoData, DeviceData, ReferrerData } from './modules/analytics';
export type { WebhookDelivery } from './modules/webhooks';
export type { TeamInvitation, TeamSettings, TeamUsage } from './modules/teams';

// Default export
import { LnkClient } from './client';
export default LnkClient;
