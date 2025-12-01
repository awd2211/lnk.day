import { useState, useEffect } from 'react';
import {
  Book,
  Code,
  Copy,
  Check,
  ExternalLink,
  Download,
  Search,
  ChevronRight,
  Play,
  Terminal,
  FileJson,
  Globe,
  Key,
  Zap,
  BarChart3,
  Lock,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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

// Types
interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'body';
    required: boolean;
    type: string;
    description: string;
  }>;
  requestBody?: {
    type: string;
    example: string;
  };
  responses: Record<
    string,
    {
      description: string;
      example?: string;
    }
  >;
}

interface ApiUsage {
  period: string;
  requests: number;
  limit: number;
  rateLimitRemaining: number;
}

// Mock API endpoints
const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/links',
    summary: '创建短链接',
    description: '创建一个新的短链接',
    tags: ['Links'],
    requestBody: {
      type: 'application/json',
      example: JSON.stringify(
        {
          originalUrl: 'https://example.com/very-long-url',
          customCode: 'my-link',
          title: 'My Link',
          tags: ['marketing'],
        },
        null,
        2
      ),
    },
    responses: {
      '201': {
        description: '创建成功',
        example: JSON.stringify(
          {
            id: 'abc123',
            shortCode: 'my-link',
            shortUrl: 'https://lnk.day/my-link',
            originalUrl: 'https://example.com/very-long-url',
            clicks: 0,
            createdAt: '2024-01-15T08:00:00Z',
          },
          null,
          2
        ),
      },
      '400': { description: '请求参数错误' },
      '401': { description: '未授权' },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/links',
    summary: '获取链接列表',
    description: '获取当前用户的所有链接',
    tags: ['Links'],
    parameters: [
      { name: 'page', in: 'query', required: false, type: 'number', description: '页码' },
      { name: 'limit', in: 'query', required: false, type: 'number', description: '每页数量' },
      { name: 'search', in: 'query', required: false, type: 'string', description: '搜索关键词' },
    ],
    responses: {
      '200': {
        description: '成功',
        example: JSON.stringify(
          {
            data: [
              {
                id: 'abc123',
                shortCode: 'my-link',
                shortUrl: 'https://lnk.day/my-link',
                clicks: 150,
              },
            ],
            meta: { page: 1, limit: 20, total: 100 },
          },
          null,
          2
        ),
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/links/{id}',
    summary: '获取链接详情',
    description: '获取指定链接的详细信息',
    tags: ['Links'],
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: '链接 ID' },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '链接不存在' },
    },
  },
  {
    method: 'DELETE',
    path: '/api/v1/links/{id}',
    summary: '删除链接',
    description: '删除指定的链接',
    tags: ['Links'],
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: '链接 ID' },
    ],
    responses: {
      '204': { description: '删除成功' },
      '404': { description: '链接不存在' },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/analytics/links/{id}',
    summary: '获取链接分析',
    description: '获取链接的点击分析数据',
    tags: ['Analytics'],
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: '链接 ID' },
      {
        name: 'period',
        in: 'query',
        required: false,
        type: 'string',
        description: '时间范围 (7d, 30d, 90d)',
      },
    ],
    responses: {
      '200': {
        description: '成功',
        example: JSON.stringify(
          {
            totalClicks: 1500,
            uniqueClicks: 1200,
            clicksByDate: [
              { date: '2024-01-15', clicks: 150 },
              { date: '2024-01-16', clicks: 180 },
            ],
            topCountries: [
              { country: 'CN', clicks: 800 },
              { country: 'US', clicks: 300 },
            ],
          },
          null,
          2
        ),
      },
    },
  },
  {
    method: 'POST',
    path: '/api/v1/qr/generate',
    summary: '生成 QR 码',
    description: '为链接生成 QR 码图片',
    tags: ['QR Codes'],
    requestBody: {
      type: 'application/json',
      example: JSON.stringify(
        {
          linkId: 'abc123',
          size: 300,
          color: '000000',
          backgroundColor: 'ffffff',
          format: 'png',
        },
        null,
        2
      ),
    },
    responses: {
      '200': { description: '返回 QR 码图片' },
    },
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
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

export default function OpenApiDocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [usage, setUsage] = useState<ApiUsage | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Load API usage stats
    setUsage({
      period: '本月',
      requests: 45678,
      limit: 100000,
      rateLimitRemaining: 54322,
    });
  }, []);

  const filteredEndpoints = apiEndpoints.filter((endpoint) => {
    const matchesSearch =
      searchQuery === '' ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || endpoint.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(apiEndpoints.flatMap((e) => e.tags)));

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(
      codeExamples[selectedLanguage as keyof typeof codeExamples]
    );
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({ title: '代码已复制' });
  };

  return (
    <Layout>
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
                href="https://api.lnk.day/docs/swagger"
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
        {usage && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API 调用</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usage.requests.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {usage.period} / {usage.limit.toLocaleString()} 上限
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">剩余配额</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usage.rateLimitRemaining.toLocaleString()}
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
                <div className="text-2xl font-bold">1000</div>
                <p className="text-xs text-muted-foreground">请求/分钟</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API 版本</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">v1</div>
                <p className="text-xs text-muted-foreground">稳定版</p>
              </CardContent>
            </Card>
          </div>
        )}

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
                  共 {filteredEndpoints.length} 个端点
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {filteredEndpoints.map((endpoint, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge className={METHOD_COLORS[endpoint.method]}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm">{endpoint.path}</code>
                          <span className="text-muted-foreground text-sm">
                            {endpoint.summary}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <p className="text-muted-foreground">
                            {endpoint.description}
                          </p>

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
                                      <TableCell>{param.description}</TableCell>
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
                              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                <code>{endpoint.requestBody.example}</code>
                              </pre>
                            </div>
                          )}

                          {/* Responses */}
                          <div>
                            <h4 className="font-medium mb-2">响应</h4>
                            <div className="space-y-2">
                              {Object.entries(endpoint.responses).map(
                                ([code, response]) => (
                                  <div key={code}>
                                    <div className="flex items-center gap-2 mb-1">
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
                                    {response.example && (
                                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                        <code>{response.example}</code>
                                      </pre>
                                    )}
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
              </CardContent>
            </Card>
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
                  <code>Authorization: Bearer YOUR_API_KEY</code>
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
          </TabsContent>

          {/* SDKs */}
          <TabsContent value="sdks" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  name: 'JavaScript/TypeScript',
                  package: '@lnk-day/sdk',
                  install: 'npm install @lnk-day/sdk',
                  icon: '🟨',
                },
                {
                  name: 'Python',
                  package: 'lnk-day',
                  install: 'pip install lnk-day',
                  icon: '🐍',
                },
                {
                  name: 'Go',
                  package: 'github.com/lnk-day/go-sdk',
                  install: 'go get github.com/lnk-day/go-sdk',
                  icon: '🔵',
                },
                {
                  name: 'PHP',
                  package: 'lnk-day/sdk',
                  install: 'composer require lnk-day/sdk',
                  icon: '🐘',
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
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm">{sdk.install}</code>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`https://github.com/lnk-day/${sdk.name.toLowerCase()}-sdk`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          GitHub
                        </a>
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
    </Layout>
  );
}
