import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Book,
  Code,
  Copy,
  Check,
  ExternalLink,
  Download,
  Search,
  Play,
  FileJson,
  Globe,
  Key,
  Zap,
  BarChart3,
  Lock,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { openApiService } from '@/lib/api';

// Types
interface OpenApiPath {
  [method: string]: {
    summary: string;
    description?: string;
    tags?: string[];
    parameters?: Array<{
      name: string;
      in: string;
      required?: boolean;
      schema?: { type: string };
      description?: string;
    }>;
    requestBody?: {
      content?: {
        'application/json'?: {
          schema?: { $ref?: string };
        };
      };
    };
    responses?: Record<string, { description: string; content?: unknown }>;
    security?: Array<{ bearerAuth?: string[] }>;
  };
}

interface OpenApiDocs {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: { name: string; email: string };
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, OpenApiPath>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

interface ApiUsageStats {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  endpointBreakdown: Record<string, number>;
  errorBreakdown: Record<string, number>;
}

interface RateLimitStatus {
  remaining: number;
  limit: number;
  reset: number;
}

interface SdkConfig {
  version: string;
  baseUrl: string;
  endpoints: Record<string, string>;
  rateLimits: { requests: number; window: string };
  authentication: { type: string; header: string; prefix: string };
}

interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required: boolean;
    type: string;
    description?: string;
  }>;
  requestBody?: {
    type: string;
    schemaRef?: string;
  };
  responses: Record<string, { description: string }>;
  requiresAuth: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  get: 'bg-green-100 text-green-700',
  post: 'bg-blue-100 text-blue-700',
  put: 'bg-yellow-100 text-yellow-700',
  patch: 'bg-orange-100 text-orange-700',
  delete: 'bg-red-100 text-red-700',
};

const codeExamples = {
  curl: `curl -X POST "https://api.lnk.day/api/v1/links" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "originalUrl": "https://example.com/long-url",
    "customCode": "my-link"
  }'`,
  javascript: `const response = await fetch('https://api.lnk.day/api/v1/links', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    originalUrl: 'https://example.com/long-url',
    customCode: 'my-link',
  }),
});

const link = await response.json();
console.log(link.shortUrl);`,
  python: `import requests

response = requests.post(
    'https://api.lnk.day/api/v1/links',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'originalUrl': 'https://example.com/long-url',
        'customCode': 'my-link',
    }
)

link = response.json()
print(link['shortUrl'])`,
  go: `package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    payload := map[string]string{
        "originalUrl": "https://example.com/long-url",
        "customCode":  "my-link",
    }
    body, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST",
        "https://api.lnk.day/api/v1/links",
        bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
}`,
};

// Transform OpenAPI paths to simplified endpoint list
function transformToEndpoints(paths: Record<string, OpenApiPath>): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, spec] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        endpoints.push({
          method: method.toUpperCase(),
          path,
          summary: spec.summary || '',
          description: spec.description,
          tags: spec.tags || [],
          parameters: spec.parameters?.map((p) => ({
            name: p.name,
            in: p.in,
            required: p.required || false,
            type: p.schema?.type || 'string',
            description: p.description,
          })),
          requestBody: spec.requestBody
            ? {
                type: 'application/json',
                schemaRef: spec.requestBody.content?.['application/json']?.schema?.$ref,
              }
            : undefined,
          responses: Object.fromEntries(
            Object.entries(spec.responses || {}).map(([code, resp]) => [
              code,
              { description: resp.description },
            ])
          ),
          requiresAuth: !!spec.security?.length,
        });
      }
    }
  }

  return endpoints;
}

export default function OpenApiDocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  const { toast } = useToast();

  // Fetch OpenAPI docs
  const {
    data: docsData,
    isLoading: docsLoading,
    error: docsError,
  } = useQuery({
    queryKey: ['openapi-docs'],
    queryFn: async () => {
      const response = await openApiService.getDocs();
      return response.data as OpenApiDocs;
    },
  });

  // Fetch usage stats
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['openapi-usage'],
    queryFn: async () => {
      try {
        const response = await openApiService.getUsage();
        return response.data as ApiUsageStats;
      } catch {
        // Return default if not authenticated or error
        return null;
      }
    },
  });

  // Fetch rate limit status
  const { data: rateLimitData } = useQuery({
    queryKey: ['openapi-rate-limit'],
    queryFn: async () => {
      try {
        const response = await openApiService.getRateLimitStatus();
        return response.data as RateLimitStatus;
      } catch {
        return null;
      }
    },
  });

  // Fetch SDK config
  const { data: sdkConfig } = useQuery({
    queryKey: ['openapi-sdk-config'],
    queryFn: async () => {
      const response = await openApiService.getSdkConfig();
      return response.data as SdkConfig;
    },
  });

  // Fetch API status
  const { data: apiStatus } = useQuery({
    queryKey: ['openapi-status'],
    queryFn: async () => {
      const response = await openApiService.getApiStatus();
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch error codes
  const { data: errorCodes } = useQuery({
    queryKey: ['openapi-errors'],
    queryFn: async () => {
      const response = await openApiService.getErrorCodes();
      return response.data;
    },
  });

  // Transform docs to endpoints
  const endpoints = docsData?.paths ? transformToEndpoints(docsData.paths) : [];

  // Filter endpoints
  const filteredEndpoints = endpoints.filter((endpoint) => {
    const matchesSearch =
      searchQuery === '' ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || endpoint.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(endpoints.flatMap((e) => e.tags)));

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(
      codeExamples[selectedLanguage as keyof typeof codeExamples]
    );
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({ title: '代码已复制' });
  };

  // Calculate usage stats
  const usage = usageData
    ? {
        period: '本月',
        requests: usageData.totalRequests,
        limit: 100000, // From plan
        rateLimitRemaining: rateLimitData?.remaining || 0,
      }
    : null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API 文档</h1>
            <p className="text-muted-foreground">lnk.day 开放 API 参考文档</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a
                href="/api/v1/open/docs/swagger"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileJson className="h-4 w-4 mr-2" />
                Swagger UI
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/settings/api-keys">
                <Key className="h-4 w-4 mr-2" />
                管理 API Key
              </a>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API 调用</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {usage?.requests.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {usage?.period || '本月'} / {usage?.limit.toLocaleString() || 100000} 上限
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">剩余配额</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rateLimitData?.remaining?.toLocaleString() || usage?.rateLimitRemaining?.toLocaleString() || '-'}
              </div>
              <p className="text-xs text-muted-foreground">次请求</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">速率限制</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sdkConfig?.rateLimits?.requests || 1000}
              </div>
              <p className="text-xs text-muted-foreground">
                请求/{sdkConfig?.rateLimits?.window || '1h'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API 状态</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  v{docsData?.info?.version || sdkConfig?.version || '1.0.0'}
                </div>
                {apiStatus?.status === 'operational' && (
                  <Badge variant="default" className="bg-green-500">
                    正常
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">稳定版</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reference">
          <TabsList>
            <TabsTrigger value="reference">
              <Book className="h-4 w-4 mr-2" />
              API 参考
            </TabsTrigger>
            <TabsTrigger value="quickstart">
              <Play className="h-4 w-4 mr-2" />
              快速开始
            </TabsTrigger>
            <TabsTrigger value="sdks">
              <Code className="h-4 w-4 mr-2" />
              SDK 下载
            </TabsTrigger>
          </TabsList>

          {/* API Reference */}
          <TabsContent value="reference" className="space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索 API 端点..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="筛选类别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类别</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Endpoints List */}
            <Card>
              <CardHeader>
                <CardTitle>API 端点</CardTitle>
                <CardDescription>
                  {docsLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      加载中...
                    </span>
                  ) : docsError ? (
                    <span className="flex items-center gap-2 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      加载失败
                    </span>
                  ) : (
                    `共 ${filteredEndpoints.length} 个端点`
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredEndpoints.map((endpoint, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <Badge className={METHOD_COLORS[endpoint.method.toLowerCase()]}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm">{endpoint.path}</code>
                            <span className="text-muted-foreground text-sm">
                              {endpoint.summary}
                            </span>
                            {endpoint.requiresAuth && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-4">
                            {endpoint.description && (
                              <p className="text-muted-foreground">
                                {endpoint.description}
                              </p>
                            )}

                            {/* Parameters */}
                            {endpoint.parameters && endpoint.parameters.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">参数</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>名称</TableHead>
                                      <TableHead>位置</TableHead>
                                      <TableHead>类型</TableHead>
                                      <TableHead>必填</TableHead>
                                      <TableHead>描述</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {endpoint.parameters.map((param) => (
                                      <TableRow key={param.name}>
                                        <TableCell>
                                          <code>{param.name}</code>
                                        </TableCell>
                                        <TableCell>{param.in}</TableCell>
                                        <TableCell>{param.type}</TableCell>
                                        <TableCell>
                                          {param.required ? (
                                            <Badge variant="destructive">是</Badge>
                                          ) : (
                                            <Badge variant="secondary">否</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>{param.description || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}

                            {/* Request Body */}
                            {endpoint.requestBody && (
                              <div>
                                <h4 className="font-medium mb-2">请求体</h4>
                                <div className="bg-muted p-4 rounded-lg">
                                  <code className="text-sm">
                                    Content-Type: {endpoint.requestBody.type}
                                  </code>
                                  {endpoint.requestBody.schemaRef && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Schema: {endpoint.requestBody.schemaRef.replace('#/components/schemas/', '')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Responses */}
                            <div>
                              <h4 className="font-medium mb-2">响应</h4>
                              <div className="space-y-2">
                                {Object.entries(endpoint.responses).map(
                                  ([code, response]) => (
                                    <div key={code} className="flex items-center gap-2">
                                      <Badge
                                        variant={
                                          code.startsWith('2')
                                            ? 'default'
                                            : 'destructive'
                                        }
                                      >
                                        {code}
                                      </Badge>
                                      <span className="text-sm">
                                        {response.description}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>

            {/* Error Codes Reference */}
            {errorCodes?.errors && (
              <Card>
                <CardHeader>
                  <CardTitle>错误代码参考</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>状态码</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>描述</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorCodes.errors.map((error: { code: number; name: string; description: string }) => (
                        <TableRow key={error.code}>
                          <TableCell>
                            <Badge variant={error.code < 500 ? 'secondary' : 'destructive'}>
                              {error.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{error.name}</TableCell>
                          <TableCell>{error.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quick Start */}
          <TabsContent value="quickstart" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>快速开始</CardTitle>
                <CardDescription>
                  几分钟内开始使用 lnk.day API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      1
                    </div>
                    <h3 className="font-semibold">获取 API Key</h3>
                  </div>
                  <p className="text-muted-foreground ml-11">
                    前往{' '}
                    <a href="/settings/api-keys" className="text-primary hover:underline">
                      API Key 管理页面
                    </a>{' '}
                    创建一个新的 API Key。
                  </p>
                </div>

                <Separator />

                {/* Step 2 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      2
                    </div>
                    <h3 className="font-semibold">发送第一个请求</h3>
                  </div>
                  <div className="ml-11 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {Object.keys(codeExamples).map((lang) => (
                          <Button
                            key={lang}
                            variant={selectedLanguage === lang ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedLanguage(lang)}
                          >
                            {lang === 'curl' ? 'cURL' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                          </Button>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={handleCopyCode}>
                        {copiedCode ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        {copiedCode ? '已复制' : '复制代码'}
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm">
                        {codeExamples[selectedLanguage as keyof typeof codeExamples]}
                      </code>
                    </pre>
                  </div>
                </div>

                <Separator />

                {/* Step 3 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      3
                    </div>
                    <h3 className="font-semibold">处理响应</h3>
                  </div>
                  <div className="ml-11">
                    <p className="text-muted-foreground mb-4">
                      成功的响应将返回创建的链接信息：
                    </p>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm">
                        {JSON.stringify(
                          {
                            id: 'abc123',
                            shortCode: 'my-link',
                            shortUrl: 'https://lnk.day/my-link',
                            originalUrl: 'https://example.com/long-url',
                            clicks: 0,
                            createdAt: '2024-01-15T08:00:00Z',
                          },
                          null,
                          2
                        )}
                      </code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>认证方式</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  所有 API 请求都需要在 Header 中包含有效的 API Key：
                </p>
                <pre className="bg-muted p-4 rounded-lg">
                  <code>
                    {sdkConfig?.authentication
                      ? `${sdkConfig.authentication.header}: ${sdkConfig.authentication.prefix} YOUR_API_KEY`
                      : 'Authorization: Bearer YOUR_API_KEY'}
                  </code>
                </pre>
                <div className="flex items-start gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      安全提示
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      请妥善保管您的 API Key，不要在客户端代码中暴露。
                      如果 Key 泄露，请立即在控制台中撤销并重新生成。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Base URL */}
            {sdkConfig && (
              <Card>
                <CardHeader>
                  <CardTitle>API 基础 URL</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {docsData?.servers?.map((server, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <code className="font-medium">{server.url}</code>
                          <p className="text-sm text-muted-foreground">{server.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(server.url);
                            toast({ title: 'URL 已复制' });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SDKs */}
          <TabsContent value="sdks" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  name: 'JavaScript/TypeScript',
                  package: '@lnk/sdk',
                  install: 'npm install @lnk/sdk',
                  icon: '🟨',
                  language: 'javascript',
                },
                {
                  name: 'Python',
                  package: 'lnk-sdk',
                  install: 'pip install lnk-sdk',
                  icon: '🐍',
                  language: 'python',
                },
                {
                  name: 'Go',
                  package: 'github.com/lnkday/sdk-go',
                  install: 'go get github.com/lnkday/sdk-go',
                  icon: '🔵',
                  language: 'go',
                },
                {
                  name: 'PHP',
                  package: 'lnk/sdk',
                  install: 'composer require lnk/sdk',
                  icon: '🐘',
                  language: 'php',
                },
                {
                  name: 'Ruby',
                  package: 'lnk-sdk',
                  install: 'gem install lnk-sdk',
                  icon: '💎',
                  language: 'ruby',
                },
                {
                  name: 'Java',
                  package: 'day.lnk:sdk',
                  install: 'implementation "day.lnk:sdk:1.0.0"',
                  icon: '☕',
                  language: 'java',
                },
                {
                  name: 'C#/.NET',
                  package: 'Lnk.Sdk',
                  install: 'dotnet add package Lnk.Sdk',
                  icon: '🟣',
                  language: 'csharp',
                },
              ].map((sdk) => (
                <Card key={sdk.name}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sdk.icon}</span>
                      <div>
                        <CardTitle>{sdk.name}</CardTitle>
                        <CardDescription>{sdk.package}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
                      <code className="text-sm">{sdk.install}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(sdk.install);
                          toast({ title: '安装命令已复制' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await openApiService.getSdkDownloadUrl(sdk.language);
                            if (response.data?.url) {
                              window.open(response.data.url, '_blank');
                            }
                          } catch {
                            // Fallback to GitHub
                            window.open(
                              `https://github.com/lnk-day/${sdk.language}-sdk`,
                              '_blank'
                            );
                          }
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        GitHub
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        文档
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
