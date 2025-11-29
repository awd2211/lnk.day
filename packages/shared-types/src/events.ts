// ==================== Exchange Names ====================
export const EXCHANGES = {
  LINK_EVENTS: 'link.events',
  CLICK_EVENTS: 'click.events',
  CAMPAIGN_EVENTS: 'campaign.events',
  USER_EVENTS: 'user.events',
  NOTIFICATION_EVENTS: 'notification.events',
} as const;

// ==================== Queue Names ====================
export const QUEUES = {
  // Analytics queues
  ANALYTICS_LINK_EVENTS: 'analytics.link.events',
  ANALYTICS_CLICK_EVENTS: 'analytics.click.events',

  // Cache invalidation queues
  LINK_CACHE_INVALIDATION: 'link.cache.invalidation',
  REDIRECT_CACHE_INVALIDATION: 'redirect.cache.invalidation',

  // Notification queues
  NOTIFICATION_EMAIL: 'notification.email',
  NOTIFICATION_SLACK: 'notification.slack',
  NOTIFICATION_WEBHOOK: 'notification.webhook',

  // Campaign queues
  CAMPAIGN_LINK_EVENTS: 'campaign.link.events',
} as const;

// ==================== Routing Keys ====================
export const ROUTING_KEYS = {
  // Link events
  LINK_CREATED: 'link.created',
  LINK_UPDATED: 'link.updated',
  LINK_DELETED: 'link.deleted',

  // Click events
  CLICK_RECORDED: 'click.recorded',
  CLICK_BATCH: 'click.batch',

  // Campaign events
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_UPDATED: 'campaign.updated',
  CAMPAIGN_DELETED: 'campaign.deleted',
  CAMPAIGN_GOAL_REACHED: 'campaign.goal.reached',

  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Notification events
  NOTIFICATION_SEND: 'notification.send',
} as const;

// ==================== Event Types ====================

export interface BaseEvent {
  id: string;
  timestamp: string;
  source: string;
}

// Link Events
export interface LinkCreatedEvent extends BaseEvent {
  type: 'link.created';
  data: {
    linkId: string;
    shortCode: string;
    originalUrl: string;
    userId: string;
    teamId?: string;
    campaignId?: string;
    tags?: string[];
    customDomain?: string;
  };
}

export interface LinkUpdatedEvent extends BaseEvent {
  type: 'link.updated';
  data: {
    linkId: string;
    shortCode: string;
    changes: Record<string, any>;
    userId: string;
    teamId?: string;
    campaignId?: string;
    previousCampaignId?: string;
  };
}

export interface LinkDeletedEvent extends BaseEvent {
  type: 'link.deleted';
  data: {
    linkId: string;
    shortCode: string;
    userId: string;
    teamId?: string;
    campaignId?: string;
  };
}

export type LinkEvent = LinkCreatedEvent | LinkUpdatedEvent | LinkDeletedEvent;

// Click Events
export interface ClickRecordedEvent extends BaseEvent {
  type: 'click.recorded';
  data: {
    linkId: string;
    shortCode: string;
    timestamp: string;
    ip?: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    device?: string;
    browser?: string;
    os?: string;
    isBot?: boolean;
  };
}

export interface ClickBatchEvent extends BaseEvent {
  type: 'click.batch';
  data: {
    clicks: ClickRecordedEvent['data'][];
  };
}

// Campaign Events
export interface CampaignCreatedEvent extends BaseEvent {
  type: 'campaign.created';
  data: {
    campaignId: string;
    name: string;
    userId: string;
    teamId?: string;
  };
}

export interface CampaignGoalReachedEvent extends BaseEvent {
  type: 'campaign.goal.reached';
  data: {
    campaignId: string;
    goalId: string;
    goalName: string;
    targetValue: number;
    currentValue: number;
    userId: string;
  };
}

export type CampaignEvent = CampaignCreatedEvent | CampaignGoalReachedEvent;

// Notification Events
export interface NotificationEvent extends BaseEvent {
  type: 'notification.send';
  data: {
    channel: 'email' | 'slack' | 'teams' | 'webhook' | 'sms';
    recipient: string;
    template: string;
    payload: Record<string, any>;
    userId?: string;
  };
}

// User Events
export interface UserCreatedEvent extends BaseEvent {
  type: 'user.created';
  data: {
    userId: string;
    email: string;
    teamId?: string;
  };
}

export type UserEvent = UserCreatedEvent;

// All Events Union
export type DomainEvent =
  | LinkEvent
  | ClickRecordedEvent
  | ClickBatchEvent
  | CampaignEvent
  | NotificationEvent
  | UserEvent;
