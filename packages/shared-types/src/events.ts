// ==================== Exchange Names ====================
export const EXCHANGES = {
  LINK_EVENTS: 'link.events',
  CLICK_EVENTS: 'click.events',
  CAMPAIGN_EVENTS: 'campaign.events',
  USER_EVENTS: 'user.events',
  NOTIFICATION_EVENTS: 'notification.events',
  // Saga & DLQ
  SAGA_EVENTS: 'saga.events',
  DEAD_LETTER: 'dead.letter',
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

  // Saga queues
  SAGA_ORCHESTRATOR: 'saga.orchestrator',
  SAGA_STEP_RESULTS: 'saga.step.results',

  // Dead letter queues
  DLQ_LINK_EVENTS: 'dlq.link.events',
  DLQ_CAMPAIGN_EVENTS: 'dlq.campaign.events',
  DLQ_NOTIFICATION_EVENTS: 'dlq.notification.events',
  DLQ_SAGA_EVENTS: 'dlq.saga.events',
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

  // Saga events
  SAGA_STARTED: 'saga.started',
  SAGA_STEP_COMPLETED: 'saga.step.completed',
  SAGA_STEP_FAILED: 'saga.step.failed',
  SAGA_COMPLETED: 'saga.completed',
  SAGA_COMPENSATING: 'saga.compensating',
  SAGA_COMPENSATED: 'saga.compensated',
  SAGA_FAILED: 'saga.failed',

  // Dead letter
  DLQ_MESSAGE: 'dlq.message',
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

// ==================== Saga Types ====================

export type SagaStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPENSATING'
  | 'COMPENSATED'
  | 'FAILED';

export type SagaStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'COMPENSATING'
  | 'COMPENSATED'
  | 'SKIPPED';

export interface SagaStep {
  name: string;
  service: string;
  status: SagaStepStatus;
  payload?: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SagaDefinition {
  sagaId: string;
  sagaType: string;
  status: SagaStatus;
  steps: SagaStep[];
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
}

// Saga Events
export interface SagaStartedEvent extends BaseEvent {
  type: 'saga.started';
  data: {
    sagaId: string;
    sagaType: string;
    payload: Record<string, any>;
    steps: string[];
  };
}

export interface SagaStepCompletedEvent extends BaseEvent {
  type: 'saga.step.completed';
  data: {
    sagaId: string;
    stepName: string;
    result: Record<string, any>;
  };
}

export interface SagaStepFailedEvent extends BaseEvent {
  type: 'saga.step.failed';
  data: {
    sagaId: string;
    stepName: string;
    error: string;
    retryable: boolean;
  };
}

export interface SagaCompletedEvent extends BaseEvent {
  type: 'saga.completed';
  data: {
    sagaId: string;
    sagaType: string;
    result: Record<string, any>;
  };
}

export interface SagaFailedEvent extends BaseEvent {
  type: 'saga.failed';
  data: {
    sagaId: string;
    sagaType: string;
    error: string;
    failedStep: string;
    compensatedSteps: string[];
  };
}

export type SagaEvent =
  | SagaStartedEvent
  | SagaStepCompletedEvent
  | SagaStepFailedEvent
  | SagaCompletedEvent
  | SagaFailedEvent;

// ==================== Dead Letter Types ====================

export interface DeadLetterMessage {
  originalExchange: string;
  originalRoutingKey: string;
  originalQueue: string;
  message: Record<string, any>;
  error: string;
  failedAt: string;
  retryCount: number;
  maxRetries: number;
  headers: Record<string, any>;
}

export interface DeadLetterEvent extends BaseEvent {
  type: 'dlq.message';
  data: DeadLetterMessage;
}

// All Events Union
export type DomainEvent =
  | LinkEvent
  | ClickRecordedEvent
  | ClickBatchEvent
  | CampaignEvent
  | NotificationEvent
  | UserEvent
  | SagaEvent
  | DeadLetterEvent;
