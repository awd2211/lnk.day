# lnk-sdk

Official Python SDK for the lnk.day link management platform.

## Installation

```bash
pip install lnk-sdk
```

## Quick Start

### Using API Key (recommended for server-side)

```python
from lnk_sdk import LnkClient, CreateLinkParams

client = LnkClient(api_key="your-api-key")

# Create a short link
link = client.links.create(CreateLinkParams(
    original_url="https://example.com/very-long-url",
    custom_code="my-link",
    tags=["marketing", "campaign-2024"],
))

print(link.short_url)  # https://lnk.day/my-link
```

### Async Support

```python
import asyncio
from lnk_sdk import LnkClient, CreateLinkParams

async def main():
    async with LnkClient(api_key="your-api-key") as client:
        link = await client.links.acreate(CreateLinkParams(
            original_url="https://example.com",
        ))
        print(link.short_url)

asyncio.run(main())
```

## Features

### Links

```python
from lnk_sdk import CreateLinkParams, UpdateLinkParams, LinkFilter

# Create a link
link = client.links.create(CreateLinkParams(
    original_url="https://example.com",
    custom_code="my-link",
    title="My Link",
    tags=["marketing"],
))

# List links with filters
result = client.links.list(
    filter=LinkFilter(tags=["marketing"], is_active=True),
    pagination=PaginationParams(page=1, limit=20),
)
for link in result.data:
    print(link.short_url)

# Update a link
link = client.links.update(link.id, UpdateLinkParams(
    title="Updated Title",
))

# Get link statistics
stats = client.links.get_stats(link.id)

# Bulk operations
result = client.links.bulk_create([
    CreateLinkParams(original_url="https://example1.com"),
    CreateLinkParams(original_url="https://example2.com"),
])
```

### Campaigns

```python
from lnk_sdk import CreateCampaignParams

# Create a campaign
campaign = client.campaigns.create(CreateCampaignParams(
    name="Q4 Marketing Campaign",
    start_date="2024-10-01",
    end_date="2024-12-31",
))

# Get campaign analytics
analytics = client.campaigns.get_analytics(campaign.id)

# Set campaign goals
client.campaigns.create_goal(
    campaign.id,
    name="Reach 10K clicks",
    goal_type="clicks",
    target=10000,
)
```

### QR Codes

```python
from lnk_sdk import CreateQRCodeParams

# Generate QR code for a link
qr = client.qr.create(CreateQRCodeParams(
    link_id=link.id,
    format="png",
    size=300,
))

# Download QR code
qr_data = client.qr.download(qr.id, format="svg")
with open("qr.svg", "wb") as f:
    f.write(qr_data)
```

### Analytics

```python
# Get summary
summary = client.analytics.get_summary(
    start_date="2024-01-01",
    end_date="2024-01-31",
)
print(f"Total clicks: {summary.total_clicks}")

# Get time series data
timeseries = client.analytics.get_timeseries(
    start_date="2024-01-01",
    end_date="2024-01-31",
    granularity="day",
)

# Export report
report_data = client.analytics.export(
    start_date="2024-01-01",
    end_date="2024-01-31",
    format="xlsx",
)
```

### Webhooks

```python
from lnk_sdk import CreateWebhookParams

# Create webhook
webhook = client.webhooks.create(CreateWebhookParams(
    url="https://your-server.com/webhooks",
    events=["link.created", "link.clicked"],
))

# Verify webhook signature
from lnk_sdk.modules.webhooks import WebhooksModule

is_valid = WebhooksModule.verify_signature(
    payload=request_body,
    signature=request.headers["X-Lnk-Signature"],
    secret=webhook.secret,
)
```

### Teams

```python
# Create a team
team = client.teams.create("My Team")

# Invite members
client.teams.invite(team.id, InviteParams(
    email="member@example.com",
    role="member",
))

# Get usage
usage = client.teams.get_usage(team.id)
```

## Error Handling

```python
from lnk_sdk import LnkClient, ApiError

try:
    client.links.create(CreateLinkParams(original_url="invalid"))
except ApiError as e:
    if e.status_code == 400:
        print(f"Validation error: {e.message}")
    elif e.status_code == 401:
        print("Authentication failed")
    elif e.status_code == 429:
        print("Rate limited, retry later")
```

## Type Hints

This SDK is fully typed for excellent IDE support:

```python
from lnk_sdk import Link, Campaign, QRCode, AnalyticsSummary

def process_link(link: Link) -> None:
    print(link.short_url)
```

## License

MIT
