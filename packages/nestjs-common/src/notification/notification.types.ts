// Email Types
export interface EmailNotification {
  to: string[];
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Slack Types
export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context';
  text?: { type: 'plain_text' | 'mrkdwn'; text: string };
  elements?: any[];
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
}

// Teams Types
export interface TeamsCard {
  '@type': 'MessageCard';
  '@context': 'http://schema.org/extensions';
  themeColor?: string;
  summary: string;
  title?: string;
  sections?: TeamsSection[];
  potentialAction?: TeamsAction[];
}

export interface TeamsSection {
  activityTitle?: string;
  activitySubtitle?: string;
  facts?: Array<{ name: string; value: string }>;
  text?: string;
  markdown?: boolean;
}

export interface TeamsAction {
  '@type': 'OpenUri';
  name: string;
  targets?: Array<{ os: string; uri: string }>;
}

// Webhook Types
export interface WebhookNotification {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  payload: Record<string, any>;
}

// SMS Types
export interface SmsNotification {
  to: string;
  message: string;
}

// Notification Result
export interface NotificationResult {
  success: boolean;
  error?: string;
}
