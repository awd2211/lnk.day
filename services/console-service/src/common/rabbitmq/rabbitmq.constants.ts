export const RABBITMQ_CONNECTION = 'RABBITMQ_CONNECTION';
export const RABBITMQ_CHANNEL = 'RABBITMQ_CHANNEL';

// 交换机
export const LINK_EVENTS_EXCHANGE = 'link.events';
export const USER_EVENTS_EXCHANGE = 'user.events';
export const NOTIFICATION_EVENTS_EXCHANGE = 'notification.events';
export const CLICK_EVENTS_EXCHANGE = 'click.events';

// 队列 - console-service 专用
export const AUTOMATION_QUEUE = 'console.automation';

// 事件类型
export const EVENT_TYPES = {
  // Link events
  LINK_CREATED: 'link.created',
  LINK_UPDATED: 'link.updated',
  LINK_DELETED: 'link.deleted',
  LINK_CLICKED: 'link.clicked',
  LINK_THRESHOLD: 'link.threshold',

  // User events
  USER_REGISTERED: 'user.registered',
  USER_UPGRADED: 'user.upgraded',
  USER_DELETED: 'user.deleted',

  // Team events
  TEAM_CREATED: 'team.created',
  TEAM_MEMBER_ADDED: 'team.member.added',
  TEAM_MEMBER_REMOVED: 'team.member.removed',

  // Quota events
  QUOTA_WARNING: 'quota.warning',
  QUOTA_EXCEEDED: 'quota.exceeded',

  // Security events
  SECURITY_THREAT: 'security.threat',
  SECURITY_SCAN_COMPLETE: 'security.scan.complete',
} as const;
