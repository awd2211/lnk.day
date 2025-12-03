import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Webhook,
  RefreshCw,
  MessageSquare,
  Hash,
  Users,
  Code,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { templatesService } from '@/lib/api';

type WebhookPlatform = 'slack' | 'discord' | 'teams' | 'custom';

interface WebhookTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  platform: WebhookPlatform;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  slackConfig?: {
    channel?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
  };
  discordConfig?: {
    username?: string;
    avatarUrl?: string;
  };
  teamsConfig?: {
    themeColor?: string;
    sections?: any[];
  };
  payloadTemplate?: Record<string, any>;
  messageTemplate?: string;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: string;
}

const PLATFORM_CONFIG: Record<WebhookPlatform, { label: string; color: string; icon: any }> = {
  slack: { label: 'Slack', color: 'bg-purple-100 text-purple-700', icon: Hash },
  discord: { label: 'Discord', color: 'bg-indigo-100 text-indigo-700', icon: MessageSquare },
  teams: { label: 'Teams', color: 'bg-blue-100 text-blue-700', icon: Users },
  custom: { label: '自定义', color: 'bg-slate-100 text-slate-700', icon: Code },
};

export default function WebhookTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WebhookTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'slack' as WebhookPlatform,
    url: '',
    method: 'POST' as 'GET' | 'POST' | 'PUT',
    slackChannel: '',
    slackUsername: '',
    slackIconEmoji: '',
    discordAvatarUrl: '',
    headersJson: '',
    messageTemplate: '',
    isActive: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['webhook-templates', page, search, platform, status],
    queryFn: () =>
      templatesService.getWebhookTemplates({
        page,
        limit: 20,
        search: search || undefined,
        platform: platform !== 'all' ? platform : undefined,
        status: status !== 'all' ? status : undefined,
      }),
  });

  const templates: WebhookTemplate[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: (data: any) => templatesService.createWebhookTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-templates'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templatesService.updateWebhookTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-templates'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteWebhookTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-templates'] });
      setShowDeleteDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => templatesService.toggleWebhookTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-templates'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      platform: 'slack',
      url: '',
      method: 'POST',
      slackChannel: '',
      slackUsername: '',
      slackIconEmoji: '',
      discordAvatarUrl: '',
      headersJson: '',
      messageTemplate: '',
      isActive: true,
    });
  };

  const openEditDialog = (template: WebhookTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      platform: template.platform,
      url: template.url || '',
      method: template.method || 'POST',
      slackChannel: template.slackConfig?.channel || '',
      slackUsername: template.slackConfig?.username || '',
      slackIconEmoji: template.slackConfig?.iconEmoji || '',
      discordAvatarUrl: template.discordConfig?.avatarUrl || '',
      headersJson: template.headers ? JSON.stringify(template.headers, null, 2) : '',
      messageTemplate: template.messageTemplate || '',
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  const preparePayload = () => {
    const payload: any = {
      name: formData.name,
      description: formData.description || undefined,
      platform: formData.platform,
      url: formData.url || undefined,
      method: formData.method,
      messageTemplate: formData.messageTemplate || undefined,
      isActive: formData.isActive,
    };

    if (formData.headersJson) {
      try {
        payload.headers = JSON.parse(formData.headersJson);
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    if (formData.platform === 'slack') {
      payload.slackConfig = {
        channel: formData.slackChannel || undefined,
        username: formData.slackUsername || undefined,
        iconEmoji: formData.slackIconEmoji || undefined,
      };
    } else if (formData.platform === 'discord') {
      payload.discordConfig = {
        avatarUrl: formData.discordAvatarUrl || undefined,
      };
    }

    return payload;
  };

  const handleCreate = () => {
    createMutation.mutate(preparePayload());
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({ id: selectedTemplate.id, data: preparePayload() });
  };

  const PlatformIcon = ({ platform }: { platform: WebhookPlatform }) => {
    const config = PLATFORM_CONFIG[platform];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook 模板</h1>
          <p className="text-gray-600 mt-1">管理 Slack、Discord、Teams 及自定义 Webhook 预设模板</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建模板
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索模板名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">已启用</SelectItem>
                <SelectItem value="inactive">已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无模板</div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <PlatformIcon platform={template.platform} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge className={PLATFORM_CONFIG[template.platform].color}>
                          {PLATFORM_CONFIG[template.platform].label}
                        </Badge>
                        {!template.isActive && (
                          <Badge variant="outline" className="text-gray-500">已禁用</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {template.url && (
                          <span className="truncate max-w-[300px]">{template.url}</span>
                        )}
                        <span>使用: {template.usageCount} 次</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={() => toggleMutation.mutate(template.id)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建 Webhook 模板</DialogTitle>
            <DialogDescription>创建通知推送预设模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 营销团队 Slack"
                />
              </div>
              <div>
                <Label>平台 *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => setFormData({ ...formData, platform: v as WebhookPlatform })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="模板用途说明"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Webhook URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://hooks.slack.com/..."
                />
              </div>
              <div>
                <Label>HTTP 方法</Label>
                <Select
                  value={formData.method}
                  onValueChange={(v) => setFormData({ ...formData, method: v as 'GET' | 'POST' | 'PUT' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.platform === 'slack' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4" /> Slack 配置
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>频道</Label>
                    <Input
                      value={formData.slackChannel}
                      onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
                      placeholder="#general"
                    />
                  </div>
                  <div>
                    <Label>用户名</Label>
                    <Input
                      value={formData.slackUsername}
                      onChange={(e) => setFormData({ ...formData, slackUsername: e.target.value })}
                      placeholder="Link Bot"
                    />
                  </div>
                  <div>
                    <Label>图标 Emoji</Label>
                    <Input
                      value={formData.slackIconEmoji}
                      onChange={(e) => setFormData({ ...formData, slackIconEmoji: e.target.value })}
                      placeholder=":link:"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.platform === 'discord' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4" /> Discord 配置
                </h4>
                <div>
                  <Label>头像 URL</Label>
                  <Input
                    value={formData.discordAvatarUrl}
                    onChange={(e) => setFormData({ ...formData, discordAvatarUrl: e.target.value })}
                    placeholder="https://example.com/avatar.png"
                  />
                </div>
              </div>
            )}

            {formData.platform === 'custom' && (
              <div>
                <Label>自定义 Headers (JSON)</Label>
                <Textarea
                  value={formData.headersJson}
                  onChange={(e) => setFormData({ ...formData, headersJson: e.target.value })}
                  placeholder='{"Authorization": "Bearer xxx"}'
                  className="font-mono text-sm"
                  rows={3}
                />
              </div>
            )}

            <div>
              <Label>消息模板</Label>
              <Textarea
                value={formData.messageTemplate}
                onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                placeholder="链接 {{link_title}} 已被点击 {{clicks}} 次"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                支持变量: {'{{link_title}}'}, {'{{short_url}}'}, {'{{clicks}}'}, {'{{unique_clicks}}'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>立即启用</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑 Webhook 模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>平台 *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => setFormData({ ...formData, platform: v as WebhookPlatform })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Webhook URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>
              <div>
                <Label>HTTP 方法</Label>
                <Select
                  value={formData.method}
                  onValueChange={(v) => setFormData({ ...formData, method: v as 'GET' | 'POST' | 'PUT' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.platform === 'slack' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4" /> Slack 配置
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>频道</Label>
                    <Input
                      value={formData.slackChannel}
                      onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>用户名</Label>
                    <Input
                      value={formData.slackUsername}
                      onChange={(e) => setFormData({ ...formData, slackUsername: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>图标 Emoji</Label>
                    <Input
                      value={formData.slackIconEmoji}
                      onChange={(e) => setFormData({ ...formData, slackIconEmoji: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.platform === 'discord' && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4" /> Discord 配置
                </h4>
                <div>
                  <Label>头像 URL</Label>
                  <Input
                    value={formData.discordAvatarUrl}
                    onChange={(e) => setFormData({ ...formData, discordAvatarUrl: e.target.value })}
                  />
                </div>
              </div>
            )}

            {formData.platform === 'custom' && (
              <div>
                <Label>自定义 Headers (JSON)</Label>
                <Textarea
                  value={formData.headersJson}
                  onChange={(e) => setFormData({ ...formData, headersJson: e.target.value })}
                  className="font-mono text-sm"
                  rows={3}
                />
              </div>
            )}

            <div>
              <Label>消息模板</Label>
              <Textarea
                value={formData.messageTemplate}
                onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={!formData.name || updateMutation.isPending}>
              {updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除模板 "{selectedTemplate?.name}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
