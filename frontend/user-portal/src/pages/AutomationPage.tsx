import { useState } from 'react';
import {
  Plus,
  Zap,
  Workflow,
  GitBranch,
  Code,
  Webhook,
  Play,
  Pause,
  Trash2,
  TestTube,
  Check,
  X,
  Loader2,
  ExternalLink,
  Copy,
  AlertCircle,
} from 'lucide-react';

import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  useAutomationWebhooks,
  useAutomationPlatforms,
  useAutomationEvents,
  useAutomationStats,
  useCreateWebhook,
  useDeleteWebhook,
  useToggleWebhook,
  useTestWebhook,
  AutomationPlatform,
  WebhookEvent,
  PLATFORM_COLORS,
} from '@/hooks/useAutomation';
import { cn } from '@/lib/utils';

const PlatformIcon = ({ platform }: { platform: AutomationPlatform }) => {
  const iconClass = 'h-5 w-5';
  switch (platform) {
    case 'zapier':
      return <Zap className={iconClass} />;
    case 'make':
      return <Workflow className={iconClass} />;
    case 'n8n':
      return <GitBranch className={iconClass} />;
    case 'pipedream':
      return <Code className={iconClass} />;
    default:
      return <Webhook className={iconClass} />;
  }
};

export default function AutomationPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    platform: 'make' as AutomationPlatform,
    webhookUrl: '',
    event: 'link.created' as WebhookEvent,
  });
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: webhooks, isLoading } = useAutomationWebhooks();
  const { data: platforms } = useAutomationPlatforms();
  const { data: events } = useAutomationEvents();
  const { data: stats } = useAutomationStats();

  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const toggleWebhook = useToggleWebhook();
  const testWebhook = useTestWebhook();

  const handleCreate = async () => {
    if (!newWebhook.name || !newWebhook.webhookUrl || !newWebhook.event) {
      toast({ title: '请填写所有必填字段', variant: 'destructive' });
      return;
    }

    try {
      await createWebhook.mutateAsync(newWebhook);
      toast({ title: 'Webhook 已创建' });
      setIsCreateOpen(false);
      setNewWebhook({ name: '', platform: 'make', webhookUrl: '', event: 'link.created' });
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testWebhook.mutateAsync(id);
      if (result.success) {
        toast({
          title: '测试成功',
          description: `响应时间: ${result.responseTime}ms`,
        });
      } else {
        toast({
          title: '测试失败',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhook.mutateAsync(id);
      toast({ title: 'Webhook 已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleWebhook.mutateAsync(id);
      toast({ title: '状态已更新' });
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const selectedPlatform = platforms?.find((p) => p.id === newWebhook.platform);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">自动化</h1>
            <p className="text-muted-foreground mt-1">
              连接 Make.com、n8n、Zapier 等自动化平台
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新建 Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>创建自动化 Webhook</DialogTitle>
                <DialogDescription>
                  当事件触发时，我们会向您指定的 URL 发送通知
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label>名称</Label>
                  <Input
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    placeholder="例如: 新链接通知到 Slack"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>平台</Label>
                  <Select
                    value={newWebhook.platform}
                    onValueChange={(v: AutomationPlatform) =>
                      setNewWebhook({ ...newWebhook, platform: v })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={p.id} />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlatform && (
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                    <p className="text-muted-foreground whitespace-pre-line">
                      {selectedPlatform.setupGuide}
                    </p>
                    {selectedPlatform.docsUrl && (
                      <a
                        href={selectedPlatform.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-primary hover:underline"
                      >
                        查看文档
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={newWebhook.webhookUrl}
                    onChange={(e) => setNewWebhook({ ...newWebhook, webhookUrl: e.target.value })}
                    placeholder="https://hook.make.com/xxx"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>触发事件</Label>
                  <Select
                    value={newWebhook.event}
                    onValueChange={(v: WebhookEvent) =>
                      setNewWebhook({ ...newWebhook, event: v })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {events?.map((e) => (
                        <SelectItem key={e.event} value={e.event}>
                          <div>
                            <span className="font-medium">{e.event}</span>
                            <span className="ml-2 text-muted-foreground">- {e.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={createWebhook.isPending}>
                  {createWebhook.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">总 Webhooks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
                <p className="text-sm text-muted-foreground">已启用</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.totalSuccesses}</div>
                <p className="text-sm text-muted-foreground">成功触发</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.totalFailures}</div>
                <p className="text-sm text-muted-foreground">失败次数</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Webhooks 列表 */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="make">Make.com</TabsTrigger>
            <TabsTrigger value="n8n">n8n</TabsTrigger>
            <TabsTrigger value="zapier">Zapier</TabsTrigger>
            <TabsTrigger value="custom">自定义</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <WebhookList
              webhooks={webhooks || []}
              onTest={handleTest}
              onDelete={handleDelete}
              onToggle={handleToggle}
              testingId={testingId}
            />
          </TabsContent>

          {['make', 'n8n', 'zapier', 'custom'].map((platform) => (
            <TabsContent key={platform} value={platform} className="mt-4">
              <WebhookList
                webhooks={(webhooks || []).filter((w) => w.platform === platform)}
                onTest={handleTest}
                onDelete={handleDelete}
                onToggle={handleToggle}
                testingId={testingId}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* 空状态 */}
        {(!webhooks || webhooks.length === 0) && (
          <div className="text-center py-12">
            <Webhook className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">还没有 Webhooks</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              创建您的第一个 Webhook 来连接自动化平台
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建 Webhook
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function WebhookList({
  webhooks,
  onTest,
  onDelete,
  onToggle,
  testingId,
}: {
  webhooks: any[];
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  testingId: string | null;
}) {
  const { toast } = useToast();

  if (webhooks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        此分类下没有 Webhooks
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {webhooks.map((webhook) => (
        <Card key={webhook.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${PLATFORM_COLORS[webhook.platform as AutomationPlatform]}20` }}
                >
                  <PlatformIcon platform={webhook.platform} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{webhook.name}</span>
                    <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                      {webhook.enabled ? '已启用' : '已禁用'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <code className="bg-muted px-1 rounded">{webhook.event}</code>
                    <span>·</span>
                    <span className="truncate max-w-[200px]">{webhook.webhookUrl}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => {
                        navigator.clipboard.writeText(webhook.webhookUrl);
                        toast({ title: '已复制 URL' });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right text-sm mr-4">
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" />
                    {webhook.successCount}
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <X className="h-3 w-3" />
                    {webhook.failureCount}
                  </div>
                </div>

                <Switch
                  checked={webhook.enabled}
                  onCheckedChange={() => onToggle(webhook.id)}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTest(webhook.id)}
                  disabled={testingId === webhook.id}
                >
                  {testingId === webhook.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除？</AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作无法撤销，Webhook 将被永久删除。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(webhook.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {webhook.lastError && (
              <div className="mt-3 flex items-start gap-2 p-2 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>最后错误: {webhook.lastError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
