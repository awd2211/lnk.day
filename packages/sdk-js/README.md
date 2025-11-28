# @lnk/sdk

Official JavaScript/TypeScript SDK for the lnk.day link management platform.

## Installation

```bash
npm install @lnk/sdk
# or
pnpm add @lnk/sdk
# or
yarn add @lnk/sdk
```

## Quick Start

### Using API Key (recommended for server-side)

```typescript
import { LnkClient } from '@lnk/sdk';

const client = LnkClient.fromApiKey('your-api-key');

// Create a short link
const link = await client.links.create({
  originalUrl: 'https://example.com/very-long-url',
  customCode: 'my-link',
  tags: ['marketing', 'campaign-2024'],
});

console.log(link.shortUrl); // https://lnk.day/my-link
```

### Using Access Token (for client-side)

```typescript
import { LnkClient } from '@lnk/sdk';

const client = new LnkClient({
  baseUrl: 'https://api.lnk.day',
});

// Login
const { user, accessToken } = await client.auth.login({
  email: 'user@example.com',
  password: 'password',
});

// Token is automatically stored
const links = await client.links.list();
```

## Features

### Links

```typescript
// Create a link
const link = await client.links.create({
  originalUrl: 'https://example.com',
  customCode: 'my-link',
  title: 'My Link',
  tags: ['marketing'],
  expiresAt: '2024-12-31T23:59:59Z',
});

// List links with filters
const { data, meta } = await client.links.list(
  { tags: ['marketing'], isActive: true },
  { page: 1, limit: 20 }
);

// Update a link
await client.links.update(link.id, {
  title: 'Updated Title',
});

// Get link statistics
const stats = await client.links.getStats(link.id);

// Bulk operations
await client.links.bulkCreate([
  { originalUrl: 'https://example1.com' },
  { originalUrl: 'https://example2.com' },
]);
```

### Campaigns

```typescript
// Create a campaign
const campaign = await client.campaigns.create({
  name: 'Q4 Marketing Campaign',
  startDate: '2024-10-01',
  endDate: '2024-12-31',
  budget: 10000,
});

// Add links to campaign
await client.campaigns.addLinks(campaign.id, [link1.id, link2.id]);

// Get campaign analytics
const analytics = await client.campaigns.getAnalytics(campaign.id);

// Set campaign goals
await client.campaigns.createGoal(campaign.id, {
  name: 'Reach 10K clicks',
  type: 'clicks',
  target: 10000,
});
```

### QR Codes

```typescript
// Generate QR code for a link
const qr = await client.qr.create({
  linkId: link.id,
  format: 'png',
  size: 300,
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
});

// Download QR code
const blob = await client.qr.download(qr.id, 'svg');

// Customize style
await client.qr.updateStyle(qr.id, {
  foregroundColor: '#1a73e8',
  logoUrl: 'https://example.com/logo.png',
  cornerRadius: 10,
});
```

### Analytics

```typescript
// Get summary
const summary = await client.analytics.getSummary(
  '2024-01-01',
  '2024-01-31'
);

// Get time series data
const timeSeries = await client.analytics.getTimeSeries({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  granularity: 'day',
});

// Get real-time data
const realtime = await client.analytics.getRealtime();

// Export report
const report = await client.analytics.export(
  { startDate: '2024-01-01', endDate: '2024-01-31' },
  'xlsx'
);
```

### Teams

```typescript
// Create a team
const team = await client.teams.create('My Team');

// Invite members
await client.teams.invite(team.id, {
  email: 'member@example.com',
  role: 'member',
});

// Get usage
const usage = await client.teams.getUsage(team.id);

// Create API key
const apiKey = await client.teams.createApiKey(team.id, 'Production Key');
```

### Webhooks

```typescript
// Create webhook
const webhook = await client.webhooks.create({
  url: 'https://your-server.com/webhooks',
  events: ['link.created', 'link.clicked'],
});

// Verify webhook signature
const isValid = client.webhooks.verifySignature(
  requestBody,
  request.headers['x-lnk-signature'],
  webhook.secret
);

// Get delivery history
const deliveries = await client.webhooks.getDeliveries(webhook.id);
```

## Error Handling

```typescript
import { LnkClient, ApiError } from '@lnk/sdk';

try {
  await client.links.create({ originalUrl: 'invalid-url' });
} catch (error) {
  if (error.statusCode === 400) {
    console.error('Validation error:', error.message);
  } else if (error.statusCode === 401) {
    console.error('Authentication failed');
  } else if (error.statusCode === 429) {
    console.error('Rate limited, retry later');
  }
}
```

## Configuration

```typescript
const client = new LnkClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.lnk.day',
  timeout: 30000,
  retries: 3,
  onTokenRefresh: (newToken) => {
    // Store new token
    localStorage.setItem('accessToken', newToken);
  },
});
```

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  Link,
  CreateLinkParams,
  Campaign,
  QRCode,
  AnalyticsSummary,
} from '@lnk/sdk';
```

## License

MIT
