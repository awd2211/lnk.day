import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Search,
  Star,
  Webhook,
  MessageSquare,
} from 'lucide-react';
import {
  useWebhookTemplates,
  useCreateWebhookTemplate,
  useUpdateWebhookTemplate,
  useDeleteWebhookTemplate,
  useDuplicateWebhookTemplate,
  useToggleWebhookTemplateFavorite,
  type WebhookTemplate,
  type CreateWebhookTemplateDto,
} from '@/hooks/useWebhookTemplates';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PresetTemplatesSection, PresetTemplateCard } from '@/components/shared';
import {
  usePresetWebhookTemplates,
  type PresetWebhookTemplate,
} from '@/hooks/usePresetTemplates';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const PLATFORMS = [
  { value: 'slack', label: 'Slack', icon: '💬' },
  { value: 'discord', label: 'Discord', icon: '🎮' },
  { value: 'teams', label: 'Microsoft Teams', icon: '👔' },
  { value: 'custom', label: '自定义', icon: '🔧' },
];

const METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
];

export default function WebhookTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('');

  // 预设模板状态
  const [presetSearch, setPresetSearch] = useState('');
  const [presetPlatformFilter, setPresetPlatformFilter] = useState<string>('');

  const { data: templates, isLoading } = useWebhookTemplates({
    platform: platformFilter || undefined,
    search: searchQuery || undefined,
  });

  // 预设模板查询
  const { data: presetTemplatesData, isLoading: presetLoading } = usePresetWebhookTemplates({
    search: presetSearch || undefined,
    platform: presetPlatformFilter || undefined,
  });

  const createTemplate = useCreateWebhookTemplate();
  const updateTemplate = useUpdateWebhookTemplate();
  const deleteTemplate = useDeleteWebhookTemplate();
  const duplicateTemplate = useDuplicateWebhookTemplate();
  const toggleFavorite = useToggleWebhookTemplateFavorite();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<WebhookTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateWebhookTemplateDto>({
    name: '',
    description: '',
    platform: 'custom',
    url: '',
    method: 'POST',
    headers: {},
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      platform: 'custom',
      url: '',
      method: 'POST',
      headers: {},
    });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast({ title: '请填写模板名称', variant: 'destructive' });
      return;
    }

    try {
      await createTemplate.mutateAsync(formData);
      toast({ title: '模板已创建' });
      setCreateDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editTemplate) return;

    try {
      await updateTemplate.mutateAsync({ id: editTemplate.id, data: formData });
      toast({ title: '模板已更新' });
      setEditTemplate(null);
      resetForm();
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplateId) return;

    try {
      await deleteTemplate.mutateAsync(deletingTemplateId);
      setDeletingTemplateId(null);
      toast({ title: '模板已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateTemplate.mutateAsync(id);
      toast({ title: '模板已复制' });
    } catch {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite.mutateAsync(id);
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const openEditDialog = (template: WebhookTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      platform: template.platform,
      url: template.url || '',
      method: template.method,
      headers: template.headers || {},
      slackConfig: template.slackConfig,
      discordConfig: template.discordConfig,
      teamsConfig: template.teamsConfig,
      payloadTemplate: template.payloadTemplate,
    });
    setEditTemplate(template);
  };

  // 使用预设模板
  const handleUsePresetTemplate = (preset: PresetWebhookTemplate) => {
    setFormData({
      name: `${preset.name} (副本)`,
      description: preset.description || '',
      platform: preset.platform || 'custom',
      url: preset.config?.url || '',
      method: (preset.config?.method as 'GET' | 'POST' | 'PUT') || 'POST',
      headers: preset.config?.headers || {},
      slackConfig: preset.platform === 'slack' ? {
        channel: preset.config?.channel,
        username: preset.config?.username,
        iconEmoji: preset.config?.iconEmoji,
      } : undefined,
      discordConfig: preset.platform === 'discord' ? {
        username: preset.config?.username,
        avatarUrl: preset.config?.avatarUrl,
      } : undefined,
      payloadTemplate: preset.config?.payloadTemplate,
    });
    setCreateDialogOpen(true);
    toast({ title: '已加载预设模板配置，可自行修改后保存' });
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
            <h1 className="text-2xl font-bold">Webhook 模板</h1>
            <p className="text-muted-foreground">
              保存常用的 Webhook 配置 (Slack, Discord, Teams 等)
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                创建模板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>创建 Webhook 模板</DialogTitle>
                <DialogDescription>
                  保存 Webhook 配置供复用
                </DialogDescription>
              </DialogHeader>
              <TemplateForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreate}
                isSubmitting={createTemplate.isPending}
                submitLabel="创建模板"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* 预设模板区域 */}
        <PresetTemplatesSection<PresetWebhookTemplate>
          title="平台预设 Webhook 模板"
          description="使用平台提供的预设 Webhook 配置，快速创建您自己的模板"
          templates={presetTemplatesData?.data}
          isLoading={presetLoading}
          categories={PLATFORMS.map((p) => ({ value: p.value, label: `${p.icon} ${p.label}` }))}
          categoryFilter={presetPlatformFilter}
          onCategoryChange={setPresetPlatformFilter}
          searchQuery={presetSearch}
          onSearchChange={setPresetSearch}
          emptyMessage="暂无预设 Webhook 模板"
          defaultOpen={!templates || templates.length === 0}
          renderTemplate={(preset) => (
            <PresetTemplateCard
              name={preset.name}
              description={preset.description}
              category={PLATFORMS.find((p) => p.value === preset.platform)?.label}
              tags={[
                preset.config?.method || 'POST',
                ...(preset.config?.channel ? [`#${preset.config.channel}`] : []),
              ]}
              icon={<Webhook className="h-5 w-5" />}
              onUse={() => handleUsePresetTemplate(preset)}
            />
          )}
        />

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模板..."
              className="pl-9"
            />
          </div>
          <Select value={platformFilter || 'all'} onValueChange={(v) => setPlatformFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="所有平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有平台</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.icon} {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template Grid */}
        {templates && templates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base line-clamp-1">
                          {template.name}
                        </CardTitle>
                        <button
                          onClick={() => handleToggleFavorite(template.id)}
                          className="text-muted-foreground hover:text-yellow-500"
                        >
                          <Star
                            className={`h-4 w-4 ${template.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`}
                          />
                        </button>
                      </div>
                      {template.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          复制
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingTemplateId(template.id)}
                          className="text-red-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">
                      {PLATFORMS.find((p) => p.value === template.platform)?.icon}{' '}
                      {PLATFORMS.find((p) => p.value === template.platform)?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {template.method}
                    </Badge>
                  </div>

                  {template.url && (
                    <p className="text-xs text-muted-foreground truncate">
                      {template.url}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>使用 {template.usageCount} 次</span>
                    <span>
                      {formatDistanceToNow(new Date(template.updatedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {searchQuery ? '未找到匹配的模板' : '还没有 Webhook 模板'}
              </h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? '尝试使用其他关键词搜索' : '创建您的第一个模板'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建模板
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={!!editTemplate}
          onOpenChange={() => {
            setEditTemplate(null);
            resetForm();
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑模板</DialogTitle>
            </DialogHeader>
            <TemplateForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleUpdate}
              isSubmitting={updateTemplate.isPending}
              submitLabel="保存"
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          open={!!deletingTemplateId}
          onOpenChange={(open) => !open && setDeletingTemplateId(null)}
          title="删除模板"
          description="确定要删除此模板吗？删除后无法恢复。"
          confirmText="删除"
          onConfirm={handleDelete}
          isLoading={deleteTemplate.isPending}
          variant="destructive"
        />
      </div>
    </Layout>
  );
}

// Template Form Component
function TemplateForm({
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  formData: CreateWebhookTemplateDto;
  setFormData: React.Dispatch<React.SetStateAction<CreateWebhookTemplateDto>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>模板名称 *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例如: Slack 通知"
          />
        </div>
        <div className="space-y-2">
          <Label>平台</Label>
          <Select
            value={formData.platform}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, platform: v as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.icon} {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>描述</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="模板用途说明..."
          rows={2}
        />
      </div>

      {/* URL and Method */}
      <div className="space-y-3 p-4 rounded-lg border">
        <h4 className="font-medium flex items-center gap-2">
          <Webhook className="h-4 w-4" />
          请求配置
        </h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2 col-span-3">
            <Label>Webhook URL</Label>
            <Input
              value={formData.url || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://hooks.slack.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>方法</Label>
            <Select
              value={formData.method}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, method: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Platform-specific config */}
      {formData.platform === 'slack' && (
        <div className="space-y-3 p-4 rounded-lg border">
          <h4 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Slack 配置
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Input
                value={formData.slackConfig?.channel || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slackConfig: { ...prev.slackConfig, channel: e.target.value },
                  }))
                }
                placeholder="#general"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={formData.slackConfig?.username || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slackConfig: { ...prev.slackConfig, username: e.target.value },
                  }))
                }
                placeholder="Bot Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon Emoji</Label>
              <Input
                value={formData.slackConfig?.iconEmoji || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slackConfig: { ...prev.slackConfig, iconEmoji: e.target.value },
                  }))
                }
                placeholder=":robot_face:"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon URL</Label>
              <Input
                value={formData.slackConfig?.iconUrl || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slackConfig: { ...prev.slackConfig, iconUrl: e.target.value },
                  }))
                }
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      )}

      {formData.platform === 'discord' && (
        <div className="space-y-3 p-4 rounded-lg border">
          <h4 className="font-medium">Discord 配置</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={formData.discordConfig?.username || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discordConfig: { ...prev.discordConfig, username: e.target.value },
                  }))
                }
                placeholder="Bot Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <Input
                value={formData.discordConfig?.avatarUrl || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discordConfig: { ...prev.discordConfig, avatarUrl: e.target.value },
                  }))
                }
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      )}

      {formData.platform === 'teams' && (
        <div className="space-y-3 p-4 rounded-lg border">
          <h4 className="font-medium">Teams 配置</h4>
          <div className="space-y-2">
            <Label>Theme Color</Label>
            <Input
              value={formData.teamsConfig?.themeColor || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  teamsConfig: { ...prev.teamsConfig, themeColor: e.target.value },
                }))
              }
              placeholder="#0078D4"
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
