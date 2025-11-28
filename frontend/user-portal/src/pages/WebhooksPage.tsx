import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useWebhooks,
  useWebhookEvents,
  useWebhookDeliveries,
  useCreateWebhook,
  useUpdateWebhook,
  useEnableWebhook,
  useDisableWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useRegenerateWebhookSecret,
  useRetryDelivery,
  WEBHOOK_STATUS_CONFIG,
  WEBHOOK_EVENT_CATEGORIES,
  WebhookEventType,
  type Webhook,
  type WebhookDelivery,
} from '@/hooks/useWebhooks';
import {
  Plus,
  Webhook as WebhookIcon,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Trash2,
  Power,
  PowerOff,
  TestTube,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  History,
  RotateCcw,
  Pencil,
} from 'lucide-react';

export default function WebhooksPage() {
  const { toast } = useToast();
  const { data: webhooksData, isLoading } = useWebhooks();
  const { data: eventsData } = useWebhookEvents();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null);
  const [deleteWebhook, setDeleteWebhook] = useState<Webhook | null>(null);
  const [viewDeliveriesFor, setViewDeliveriesFor] = useState<Webhook | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: deliveriesData } = useWebhookDeliveries(viewDeliveriesFor?.id || null);

  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const enableWebhook = useEnableWebhook();
  const disableWebhook = useDisableWebhook();
  const deleteWebhookMutation = useDeleteWebhook();
  const testWebhook = useTestWebhook();
  const regenerateSecret = useRegenerateWebhookSecret();
  const retryDelivery = useRetryDelivery();

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    events: [] as WebhookEventType[],
  });

  const webhooks = webhooksData?.data || [];

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      events: [],
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast({ title: '请填写所有必填字段', variant: 'destructive' });
      return;
    }

    try {
      await createWebhook.mutateAsync({
        name: formData.name,
        url: formData.url,
        description: formData.description || undefined,
        events: formData.events,
      });
      toast({ title: 'Webhook 已创建' });
      setIsAddDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editWebhook) return;

    try {
      await updateWebhook.mutateAsync({
        id: editWebhook.id,
        data: {
          name: formData.name,
          url: formData.url,
          description: formData.description || undefined,
          events: formData.events,
        },
      });
      toast({ title: 'Webhook 已更新' });
      setEditWebhook(null);
      resetForm();
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleToggleEnabled = async (webhook: Webhook) => {
    try {
      if (webhook.enabled) {
        await disableWebhook.mutateAsync(webhook.id);
        toast({ title: 'Webhook 已禁用' });
      } else {
        await enableWebhook.mutateAsync(webhook.id);
        toast({ title: 'Webhook 已启用' });
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteWebhook) return;
    try {
      await deleteWebhookMutation.mutateAsync(deleteWebhook.id);
      toast({ title: 'Webhook 已删除' });
      setDeleteWebhook(null);
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleTest = async (id: string, event: WebhookEventType) => {
    setTestingId(id);
    try {
      const result = await testWebhook.mutateAsync({ id, event });
      if (result.success) {
        toast({
          title: '测试成功',
          description: `响应状态: ${result.statusCode}, 耗时: ${result.responseTime}ms`,
        });
      } else {
        toast({
          title: '测试失败',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: '测试失败', variant: 'destructive' });
    } finally {
      setTestingId(null);
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    try {
      const result = await regenerateSecret.mutateAsync(id);
      toast({
        title: '密钥已重新生成',
        description: `新密钥: ${result.secret.substring(0, 20)}...`,
      });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      await retryDelivery.mutateAsync(deliveryId);
      toast({ title: '重试请求已发送' });
    } catch {
      toast({ title: '重试失败', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '已复制到剪贴板' });
  };

  const toggleEvent = (event: WebhookEventType) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const toggleCategory = (events: WebhookEventType[]) => {
    const allSelected = events.every((e) => formData.events.includes(e));
    setFormData((prev) => ({
      ...prev,
      events: allSelected
        ? prev.events.filter((e) => !events.includes(e))
        : [...new Set([...prev.events, ...events])],
    }));
  };

  const openEditDialog = (webhook: Webhook) => {
    setFormData({
      name: webhook.name,
      url: webhook.url,
      description: webhook.description || '',
      events: webhook.events,
    });
    setEditWebhook(webhook);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Webhooks</h1>
            <p className="text-gray-500">接收实时事件通知，与您的系统集成</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                添加 Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建 Webhook</DialogTitle>
              </DialogHeader>
              <WebhookForm
                formData={formData}
                setFormData={setFormData}
                toggleEvent={toggleEvent}
                toggleCategory={toggleCategory}
                onSubmit={handleCreate}
                isSubmitting={createWebhook.isPending}
                submitLabel="创建"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Webhooks List */}
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <WebhookIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium">尚未配置 Webhook</h3>
              <p className="mt-2 text-gray-500">
                添加 Webhook 以接收实时事件通知
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => {
              const statusConfig = WEBHOOK_STATUS_CONFIG[webhook.status];
              const successRate =
                webhook.successCount + webhook.failureCount > 0
                  ? Math.round(
                      (webhook.successCount /
                        (webhook.successCount + webhook.failureCount)) *
                        100
                    )
                  : 100;

              return (
                <Card key={webhook.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{webhook.name}</h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                          >
                            {webhook.enabled ? (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            ) : (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {webhook.enabled ? statusConfig.label : '已禁用'}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                            {webhook.url}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(webhook.url)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {webhook.description && (
                          <p className="mt-2 text-sm text-gray-500">
                            {webhook.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-1">
                          {webhook.events.slice(0, 5).map((event) => (
                            <span
                              key={event}
                              className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
                            >
                              {event}
                            </span>
                          ))}
                          {webhook.events.length > 5 && (
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              +{webhook.events.length - 5}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                          <div>
                            <span className="text-gray-500">成功率</span>
                            <p
                              className={`font-medium ${
                                successRate >= 90
                                  ? 'text-green-600'
                                  : successRate >= 70
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {successRate}%
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">投递次数</span>
                            <p className="font-medium">
                              {webhook.successCount + webhook.failureCount}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">最后触发</span>
                            <p className="font-medium">
                              {formatDate(webhook.lastTriggeredAt)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">密钥</span>
                            <div className="flex items-center gap-1">
                              {showSecret[webhook.id] ? (
                                <code className="text-xs">
                                  {webhook.secret.substring(0, 20)}...
                                </code>
                              ) : (
                                <code className="text-xs">••••••••••••</code>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() =>
                                  setShowSecret((prev) => ({
                                    ...prev,
                                    [webhook.id]: !prev[webhook.id],
                                  }))
                                }
                              >
                                {showSecret[webhook.id] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {webhook.lastErrorMessage && (
                          <div className="mt-3 flex items-start gap-2 rounded bg-red-50 p-2 text-xs text-red-600">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>{webhook.lastErrorMessage}</span>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewDeliveriesFor(webhook)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Select
                          onValueChange={(event) =>
                            handleTest(webhook.id, event as WebhookEventType)
                          }
                          disabled={testingId === webhook.id}
                        >
                          <SelectTrigger className="w-10 p-0 border-0 bg-transparent">
                            <Button variant="outline" size="sm" asChild>
                              <span>
                                {testingId === webhook.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <TestTube className="h-4 w-4" />
                                )}
                              </span>
                            </Button>
                          </SelectTrigger>
                          <SelectContent>
                            {webhook.events.map((event) => (
                              <SelectItem key={event} value={event}>
                                {event}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateSecret(webhook.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(webhook)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleEnabled(webhook)}
                        >
                          {webhook.enabled ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteWebhook(webhook)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={!!editWebhook}
          onOpenChange={() => {
            setEditWebhook(null);
            resetForm();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑 Webhook</DialogTitle>
            </DialogHeader>
            <WebhookForm
              formData={formData}
              setFormData={setFormData}
              toggleEvent={toggleEvent}
              toggleCategory={toggleCategory}
              onSubmit={handleUpdate}
              isSubmitting={updateWebhook.isPending}
              submitLabel="保存"
            />
          </DialogContent>
        </Dialog>

        {/* Deliveries Sheet */}
        <Sheet
          open={!!viewDeliveriesFor}
          onOpenChange={() => setViewDeliveriesFor(null)}
        >
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>投递记录 - {viewDeliveriesFor?.name}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {!deliveriesData?.data?.length ? (
                <div className="py-8 text-center text-gray-500">
                  暂无投递记录
                </div>
              ) : (
                deliveriesData.data.map((delivery: WebhookDelivery) => (
                  <Card key={delivery.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {delivery.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">{delivery.event}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(delivery.createdAt)}
                            </span>
                            {delivery.statusCode && (
                              <span>状态码: {delivery.statusCode}</span>
                            )}
                            {delivery.responseTime && (
                              <span>耗时: {delivery.responseTime}ms</span>
                            )}
                          </div>
                          {delivery.error && (
                            <p className="mt-2 text-xs text-red-500">
                              {delivery.error}
                            </p>
                          )}
                        </div>
                        {!delivery.success && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryDelivery(delivery.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteWebhook}
          onOpenChange={() => setDeleteWebhook(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                确认删除
              </AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除 Webhook "{deleteWebhook?.name}" 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteWebhookMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}

// Webhook Form Component
function WebhookForm({
  formData,
  setFormData,
  toggleEvent,
  toggleCategory,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  formData: {
    name: string;
    url: string;
    description: string;
    events: WebhookEventType[];
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      url: string;
      description: string;
      events: WebhookEventType[];
    }>
  >;
  toggleEvent: (event: WebhookEventType) => void;
  toggleCategory: (events: WebhookEventType[]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>名称 *</Label>
        <Input
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="例如: 点击事件通知"
        />
      </div>

      <div className="space-y-2">
        <Label>Webhook URL *</Label>
        <Input
          value={formData.url}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, url: e.target.value }))
          }
          placeholder="https://your-server.com/webhook"
        />
      </div>

      <div className="space-y-2">
        <Label>描述</Label>
        <Textarea
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Webhook 用途说明..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>事件类型 *</Label>
        <p className="text-xs text-gray-500">选择要接收的事件</p>
        <div className="max-h-64 overflow-y-auto rounded border p-4 space-y-4">
          {Object.entries(WEBHOOK_EVENT_CATEGORIES).map(
            ([key, { label, events }]) => {
              const allSelected = events.every((e) =>
                formData.events.includes(e)
              );
              const someSelected = events.some((e) =>
                formData.events.includes(e)
              );

              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleCategory(events)}
                      className={someSelected && !allSelected ? 'opacity-50' : ''}
                    />
                    <Label className="font-medium cursor-pointer">
                      {label}
                    </Label>
                  </div>
                  <div className="ml-6 grid grid-cols-2 gap-2">
                    {events.map((event) => (
                      <label
                        key={event}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={formData.events.includes(event)}
                          onCheckedChange={() => toggleEvent(event)}
                        />
                        <span className="text-gray-600">
                          {event.replace('.', ' → ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
          )}
        </div>
        <p className="text-xs text-gray-500">
          已选择 {formData.events.length} 个事件
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
