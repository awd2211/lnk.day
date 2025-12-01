import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

import { OpenApiService } from './openapi.service';
import { OpenApiGuard } from './openapi.guard';

@ApiTags('Open API')
@Controller('open')
export class OpenApiController {
  constructor(private readonly openApiService: OpenApiService) {}

  // ==================== 文档和配置 ====================

  @Get('docs')
  @ApiOperation({ summary: '获取 OpenAPI 文档' })
  getOpenApiDocs() {
    return this.openApiService.getApiDocumentation();
  }

  @Get('docs/swagger')
  @ApiOperation({ summary: '获取 Swagger UI HTML' })
  getSwaggerUI(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>lnk.day API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/open/docs',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`;
    res.type('text/html').send(html);
  }

  @Get('sdk/config')
  @ApiOperation({ summary: '获取 SDK 配置' })
  getSdkConfig() {
    return this.openApiService.getSdkConfig();
  }

  // ==================== API Key 验证 ====================

  @Post('validate-key')
  @ApiOperation({ summary: '验证 API Key' })
  @ApiHeader({ name: 'X-API-Key', description: 'API Key to validate' })
  async validateApiKey(
    @Headers('x-api-key') apiKey: string,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    const result = await this.openApiService.validateApiKey(apiKey, clientIp);

    if (!result.valid) {
      return {
        valid: false,
        error: result.error,
      };
    }

    return {
      valid: true,
      tenantId: result.tenantId,
      scopes: result.scopes,
      rateLimit: {
        limit: result.rateLimit,
        window: '1h',
      },
    };
  }

  // ==================== 速率限制状态 ====================

  @Get('rate-limit/status')
  @UseGuards(OpenApiGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前 API Key 的速率限制状态' })
  async getRateLimitStatus(@Req() req: any) {
    const apiKeyId = req.apiKeyContext?.apiKeyId;
    const rateLimit = req.apiKeyContext?.rateLimit || 1000;

    const status = await this.openApiService.checkRateLimit(apiKeyId, rateLimit);
    return status;
  }

  // ==================== 使用量统计 ====================

  @Get('usage')
  @UseGuards(OpenApiGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 API 使用量统计' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getUsageStats(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const apiKeyId = req.apiKeyContext?.apiKeyId;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.openApiService.getUsageStats(apiKeyId, start, end);
  }

  // ==================== Webhook 配置 ====================

  @Post('webhooks/secret')
  @UseGuards(OpenApiGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成 Webhook 签名密钥' })
  generateWebhookSecret() {
    const secret = this.openApiService.generateWebhookSecret();
    return { secret };
  }

  @Post('webhooks/verify')
  @ApiOperation({ summary: '验证 Webhook 签名' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['payload', 'signature', 'secret'],
      properties: {
        payload: { type: 'string' },
        signature: { type: 'string' },
        secret: { type: 'string' },
      },
    },
  })
  verifyWebhookSignature(
    @Body() data: { payload: string; signature: string; secret: string },
  ) {
    const valid = this.openApiService.verifyWebhookSignature(
      data.payload,
      data.signature,
      data.secret,
    );
    return { valid };
  }

  // ==================== SDK 下载 ====================

  @Get('sdk/download/:language')
  @ApiOperation({ summary: '下载 SDK' })
  getSdkDownloadUrl(@Req() req: Request) {
    const language = req.params.language;
    const sdkUrls: Record<string, string> = {
      javascript: 'https://www.npmjs.com/package/@lnk/sdk',
      typescript: 'https://www.npmjs.com/package/@lnk/sdk',
      python: 'https://pypi.org/project/lnk-sdk/',
      php: 'https://packagist.org/packages/lnk/sdk',
      ruby: 'https://rubygems.org/gems/lnk-sdk',
      go: 'https://pkg.go.dev/github.com/lnkday/sdk-go',
      java: 'https://mvnrepository.com/artifact/day.lnk/sdk',
      csharp: 'https://www.nuget.org/packages/Lnk.Sdk/',
    };

    return {
      language,
      url: sdkUrls[language] || null,
      installCommand: this.getInstallCommand(language),
    };
  }

  private getInstallCommand(language: string): string | null {
    const commands: Record<string, string> = {
      javascript: 'npm install @lnk/sdk',
      typescript: 'npm install @lnk/sdk',
      python: 'pip install lnk-sdk',
      php: 'composer require lnk/sdk',
      ruby: 'gem install lnk-sdk',
      go: 'go get github.com/lnkday/sdk-go',
      java: 'implementation "day.lnk:sdk:1.0.0"',
      csharp: 'dotnet add package Lnk.Sdk',
    };
    return commands[language] || null;
  }

  // ==================== 代码示例 ====================

  @Get('examples/:language/:operation')
  @ApiOperation({ summary: '获取代码示例' })
  getCodeExample(@Req() req: Request) {
    const { language, operation } = req.params;
    return {
      language,
      operation,
      code: this.getExampleCode(language, operation),
    };
  }

  private getExampleCode(language: string, operation: string): string {
    const examples: Record<string, Record<string, string>> = {
      javascript: {
        createLink: `
import { LnkClient } from '@lnk/sdk';

const client = new LnkClient({ apiKey: 'your_api_key' });

const link = await client.links.create({
  originalUrl: 'https://example.com',
  title: 'My Link',
  tags: ['marketing', 'campaign'],
});

console.log(link.shortUrl);
`,
        getAnalytics: `
import { LnkClient } from '@lnk/sdk';

const client = new LnkClient({ apiKey: 'your_api_key' });

const analytics = await client.analytics.get('link_id', {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  granularity: 'day',
});

console.log(analytics.totalClicks);
`,
        bulkCreate: `
import { LnkClient } from '@lnk/sdk';

const client = new LnkClient({ apiKey: 'your_api_key' });

const result = await client.links.bulkCreate([
  { originalUrl: 'https://example1.com' },
  { originalUrl: 'https://example2.com' },
  { originalUrl: 'https://example3.com' },
]);

console.log(\`Created: \${result.created}, Failed: \${result.failed}\`);
`,
      },
      python: {
        createLink: `
from lnk_sdk import LnkClient

client = LnkClient(api_key='your_api_key')

link = client.links.create(
    original_url='https://example.com',
    title='My Link',
    tags=['marketing', 'campaign']
)

print(link.short_url)
`,
        getAnalytics: `
from lnk_sdk import LnkClient

client = LnkClient(api_key='your_api_key')

analytics = client.analytics.get(
    link_id='link_id',
    start_date='2024-01-01',
    end_date='2024-01-31',
    granularity='day'
)

print(analytics.total_clicks)
`,
      },
      curl: {
        createLink: `
curl -X POST https://api.lnk.day/api/v1/links \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "originalUrl": "https://example.com",
    "title": "My Link",
    "tags": ["marketing", "campaign"]
  }'
`,
        getAnalytics: `
curl -X GET "https://api.lnk.day/api/v1/links/link_id/analytics?startDate=2024-01-01&endDate=2024-01-31" \\
  -H "Authorization: Bearer your_api_key"
`,
      },
    };

    return examples[language]?.[operation] || '// Example not available';
  }

  // ==================== API 状态 ====================

  @Get('status')
  @ApiOperation({ summary: '获取 API 服务状态' })
  getApiStatus() {
    return {
      status: 'operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: 'operational',
        cache: 'operational',
        analytics: 'operational',
      },
      latency: {
        p50: '45ms',
        p95: '120ms',
        p99: '250ms',
      },
    };
  }

  // ==================== 变更日志 ====================

  @Get('changelog')
  @ApiOperation({ summary: '获取 API 变更日志' })
  getChangelog() {
    return {
      changes: [
        {
          version: '1.0.0',
          date: '2024-01-15',
          changes: [
            { type: 'added', description: '初始 API 发布' },
            { type: 'added', description: '链接管理 API' },
            { type: 'added', description: '分析数据 API' },
            { type: 'added', description: 'QR 码生成 API' },
          ],
        },
        {
          version: '1.1.0',
          date: '2024-02-01',
          changes: [
            { type: 'added', description: '批量操作支持' },
            { type: 'added', description: 'Webhook 集成' },
            { type: 'improved', description: '速率限制优化' },
          ],
        },
      ],
    };
  }

  // ==================== 错误代码参考 ====================

  @Get('errors')
  @ApiOperation({ summary: '获取错误代码参考' })
  getErrorCodes() {
    return {
      errors: [
        { code: 400, name: 'Bad Request', description: '请求参数无效' },
        { code: 401, name: 'Unauthorized', description: 'API Key 无效或缺失' },
        { code: 403, name: 'Forbidden', description: '权限不足' },
        { code: 404, name: 'Not Found', description: '资源不存在' },
        { code: 409, name: 'Conflict', description: '资源冲突（如短码已存在）' },
        { code: 422, name: 'Unprocessable Entity', description: '请求格式正确但语义错误' },
        { code: 429, name: 'Too Many Requests', description: '超出速率限制' },
        { code: 500, name: 'Internal Server Error', description: '服务器内部错误' },
        { code: 503, name: 'Service Unavailable', description: '服务暂时不可用' },
      ],
    };
  }
}
