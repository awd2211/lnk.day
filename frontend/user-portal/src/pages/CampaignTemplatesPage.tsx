import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Rocket,
  Users,
  Globe,
  Lock,
  Loader2,
  FileText,
  Share2,
  Mail,
  DollarSign,
  Calendar,
  Gift,
  Zap,
  Search,
  Star,
  BarChart3,
} from 'lucide-react';
import {
  useCampaignTemplates,
  useCreateCampaignTemplate,
  useUpdateCampaignTemplate,
  useDeleteCampaignTemplate,
  useDuplicateCampaignTemplate,
  useCreateCampaignFromTemplate,
  systemTemplateTypes,
  type CampaignTemplate,
  type CreateCampaignTemplateDto,
} from '@/hooks/useCampaignTemplates';
import { CampaignType, CAMPAIGN_TYPE_CONFIG, CHANNEL_OPTIONS } from '@/hooks/useCampaigns';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const systemIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'share-2': Share2,
  mail: Mail,
  'dollar-sign': DollarSign,
  users: Users,
  rocket: Rocket,
  calendar: Calendar,
  gift: Gift,
  'file-text': FileText,
};

export default function CampaignTemplatesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: templates, isLoading } = useCampaignTemplates({ includeSystem: true });
  const createTemplate = useCreateCampaignTemplate();
  const updateTemplate = useUpdateCampaignTemplate();
  const deleteTemplate = useDeleteCampaignTemplate();
  const duplicateTemplate = useDuplicateCampaignTemplate();
  const createFromTemplate = useCreateCampaignFromTemplate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<CampaignTemplate | null>(null);
  const [useTemplateDialog, setUseTemplateDialog] = useState<CampaignTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCampaignTemplateDto>({
    name: '',
    description: '',
    type: CampaignType.MARKETING,
    channels: [],
    utmParams: {},
    tags: [],
    settings: {
      autoArchiveOnEnd: true,
      notifyOnGoalReached: true,
    },
    isPublic: false,
  });

  const [tagsInput, setTagsInput] = useState('');
  const [goalType, setGoalType] = useState<'clicks' | 'conversions' | 'revenue'>('clicks');
  const [goalTarget, setGoalTarget] = useState('');

  // Use template form state
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: CampaignType.MARKETING,
      channels: [],
      utmParams: {},
      tags: [],
      settings: {
        autoArchiveOnEnd: true,
        notifyOnGoalReached: true,
      },
      isPublic: false,
    });
    setTagsInput('');
    setGoalType('clicks');
    setGoalTarget('');
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast({ title: '请填写模板名称', variant: 'destructive' });
      return;
    }

    try {
      const data = {
        ...formData,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        goal: goalTarget
          ? { type: goalType, target: parseInt(goalTarget) }
          : undefined,
      };
      await createTemplate.mutateAsync(data);
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
      const data = {
        ...formData,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        goal: goalTarget
          ? { type: goalType, target: parseInt(goalTarget) }
          : undefined,
      };
      await updateTemplate.mutateAsync({ id: editTemplate.id, data });
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

  const handleUseTemplate = async () => {
    if (!useTemplateDialog || !campaignName) {
      toast({ title: '请填写活动名称', variant: 'destructive' });
      return;
    }

    try {
      await createFromTemplate.mutateAsync({
        templateId: useTemplateDialog.id,
        overrides: {
          name: campaignName,
          description: campaignDescription,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      toast({ title: '活动已创建' });
      setUseTemplateDialog(null);
      setCampaignName('');
      setCampaignDescription('');
      setStartDate('');
      setEndDate('');
      navigate('/campaigns');
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const openEditDialog = (template: CampaignTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      type: template.type,
      channels: template.channels,
      utmParams: template.utmParams,
      defaultBudget: template.defaultBudget,
      defaultDuration: template.defaultDuration,
      tags: template.tags,
      settings: template.settings,
      isPublic: template.isPublic,
    });
    setTagsInput(template.tags.join(', '));
    if (template.goal) {
      setGoalType(template.goal.type);
      setGoalTarget(template.goal.target.toString());
    }
    setEditTemplate(template);
  };

  const toggleChannel = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels?.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...(prev.channels || []), channel],
    }));
  };

  const myTemplates = templates?.filter((t) => !t.isSystem) || [];
  const systemTemplates = templates?.filter((t) => t.isSystem) || [];

  const filteredMyTemplates = myTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold">活动模板</h1>
            <p className="text-muted-foreground">
              使用模板快速创建营销活动
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                创建模板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建活动模板</DialogTitle>
                <DialogDescription>
                  创建可复用的活动模板，快速启动新活动
                </DialogDescription>
              </DialogHeader>
              <TemplateForm
                formData={formData}
                setFormData={setFormData}
                tagsInput={tagsInput}
                setTagsInput={setTagsInput}
                goalType={goalType}
                setGoalType={setGoalType}
                goalTarget={goalTarget}
                setGoalTarget={setGoalTarget}
                toggleChannel={toggleChannel}
                onSubmit={handleCreate}
                isSubmitting={createTemplate.isPending}
                submitLabel="创建模板"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模板..."
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="my-templates">
          <TabsList>
            <TabsTrigger value="my-templates">我的模板 ({myTemplates.length})</TabsTrigger>
            <TabsTrigger value="system-templates">系统模板</TabsTrigger>
          </TabsList>

          <TabsContent value="my-templates" className="mt-4">
            {filteredMyTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMyTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={() => setUseTemplateDialog(template)}
                    onEdit={() => openEditDialog(template)}
                    onDuplicate={() => handleDuplicate(template.id)}
                    onDelete={() => setDeletingTemplateId(template.id)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">
                    {searchQuery ? '未找到匹配的模板' : '还没有模板'}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {searchQuery
                      ? '尝试使用其他关键词搜索'
                      : '创建您的第一个活动模板'}
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
          </TabsContent>

          <TabsContent value="system-templates" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {systemTemplateTypes.map((type) => {
                const Icon = systemIcons[type.icon] || Zap;
                const typeTemplates = systemTemplates.filter(
                  (t) => t.description?.includes(type.id)
                );

                return (
                  <Card key={type.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{type.name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {type.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => {
                          // Create a mock system template for demo
                          const mockTemplate: CampaignTemplate = {
                            id: `system-${type.id}`,
                            name: type.name,
                            description: type.description,
                            type: CampaignType.MARKETING,
                            channels: [],
                            utmParams: {},
                            tags: [type.id],
                            settings: { autoArchiveOnEnd: true, notifyOnGoalReached: true },
                            isSystem: true,
                            usageCount: 0,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            createdBy: { id: 'system', name: '系统' },
                          };
                          setUseTemplateDialog(mockTemplate);
                        }}
                      >
                        <Rocket className="mr-2 h-4 w-4" />
                        使用模板
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog
          open={!!editTemplate}
          onOpenChange={() => {
            setEditTemplate(null);
            resetForm();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑模板</DialogTitle>
            </DialogHeader>
            <TemplateForm
              formData={formData}
              setFormData={setFormData}
              tagsInput={tagsInput}
              setTagsInput={setTagsInput}
              goalType={goalType}
              setGoalType={setGoalType}
              goalTarget={goalTarget}
              setGoalTarget={setGoalTarget}
              toggleChannel={toggleChannel}
              onSubmit={handleUpdate}
              isSubmitting={updateTemplate.isPending}
              submitLabel="保存"
            />
          </DialogContent>
        </Dialog>

        {/* Use Template Dialog */}
        <Dialog open={!!useTemplateDialog} onOpenChange={() => setUseTemplateDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>从模板创建活动</DialogTitle>
              <DialogDescription>
                基于 "{useTemplateDialog?.name}" 模板创建新活动
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>活动名称 *</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="输入活动名称"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  placeholder="活动描述（可选）"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Template preview */}
              {useTemplateDialog && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="text-sm font-medium mb-2">模板配置</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>类型: {CAMPAIGN_TYPE_CONFIG[useTemplateDialog.type]?.label}</p>
                    {useTemplateDialog.channels?.length > 0 && (
                      <p>渠道: {useTemplateDialog.channels.join(', ')}</p>
                    )}
                    {useTemplateDialog.utmParams?.source && (
                      <p>UTM Source: {useTemplateDialog.utmParams.source}</p>
                    )}
                    {useTemplateDialog.goal && (
                      <p>目标: {useTemplateDialog.goal.target} {useTemplateDialog.goal.type}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUseTemplateDialog(null)}>
                取消
              </Button>
              <Button onClick={handleUseTemplate} disabled={createFromTemplate.isPending}>
                {createFromTemplate.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                创建活动
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Template Confirm Dialog */}
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

// Template Card Component
function TemplateCard({
  template,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: CampaignTemplate;
  onUse: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const typeConfig = CAMPAIGN_TYPE_CONFIG[template.type];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
              {template.isPublic ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
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
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                复制
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-500">
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{typeConfig?.label}</Badge>
          {template.channels?.slice(0, 2).map((channel) => (
            <Badge key={channel} variant="secondary" className="text-xs">
              {channel}
            </Badge>
          ))}
          {(template.channels?.length || 0) > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{template.channels!.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            使用 {template.usageCount} 次
          </div>
          <span>
            {formatDistanceToNow(new Date(template.updatedAt), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
        </div>

        <Button variant="outline" className="w-full" onClick={onUse}>
          <Rocket className="mr-2 h-4 w-4" />
          使用此模板
        </Button>
      </CardContent>
    </Card>
  );
}

// Template Form Component
function TemplateForm({
  formData,
  setFormData,
  tagsInput,
  setTagsInput,
  goalType,
  setGoalType,
  goalTarget,
  setGoalTarget,
  toggleChannel,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  formData: CreateCampaignTemplateDto;
  setFormData: React.Dispatch<React.SetStateAction<CreateCampaignTemplateDto>>;
  tagsInput: string;
  setTagsInput: (v: string) => void;
  goalType: 'clicks' | 'conversions' | 'revenue';
  setGoalType: (v: 'clicks' | 'conversions' | 'revenue') => void;
  goalTarget: string;
  setGoalTarget: (v: string) => void;
  toggleChannel: (channel: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <Tabs defaultValue="basic" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">基本信息</TabsTrigger>
        <TabsTrigger value="tracking">跟踪设置</TabsTrigger>
        <TabsTrigger value="defaults">默认值</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        <div className="space-y-2">
          <Label>模板名称 *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例如: 社交媒体推广模板"
          />
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

        <div className="space-y-2">
          <Label>活动类型</Label>
          <Select
            value={formData.type}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v as CampaignType }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CAMPAIGN_TYPE_CONFIG).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>渠道</Label>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((channel) => (
              <label key={channel.value} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={formData.channels?.includes(channel.value)}
                  onCheckedChange={() => toggleChannel(channel.value)}
                />
                <span className="text-sm">{channel.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>标签 (逗号分隔)</Label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="促销, 2024, 春季"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>公开给团队</Label>
            <p className="text-xs text-muted-foreground">允许团队成员使用此模板</p>
          </div>
          <Switch
            checked={formData.isPublic}
            onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isPublic: v }))}
          />
        </div>
      </TabsContent>

      <TabsContent value="tracking" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          设置默认的 UTM 参数，创建活动时将自动填充
        </p>

        <div className="space-y-2">
          <Label>utm_source</Label>
          <Input
            value={formData.utmParams?.source || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                utmParams: { ...prev.utmParams, source: e.target.value },
              }))
            }
            placeholder="例如: facebook, google, newsletter"
          />
        </div>

        <div className="space-y-2">
          <Label>utm_medium</Label>
          <Input
            value={formData.utmParams?.medium || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                utmParams: { ...prev.utmParams, medium: e.target.value },
              }))
            }
            placeholder="例如: cpc, email, social"
          />
        </div>

        <div className="space-y-2">
          <Label>utm_campaign</Label>
          <Input
            value={formData.utmParams?.campaign || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                utmParams: { ...prev.utmParams, campaign: e.target.value },
              }))
            }
            placeholder="例如: spring_sale (可使用变量 {campaign_name})"
          />
        </div>
      </TabsContent>

      <TabsContent value="defaults" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>默认预算</Label>
            <Input
              type="number"
              value={formData.defaultBudget || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  defaultBudget: e.target.value ? parseFloat(e.target.value) : undefined,
                }))
              }
              placeholder="¥"
            />
          </div>
          <div className="space-y-2">
            <Label>默认时长 (天)</Label>
            <Input
              type="number"
              value={formData.defaultDuration || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  defaultDuration: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
              placeholder="30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>默认目标类型</Label>
          <Select
            value={goalType}
            onValueChange={(v) => setGoalType(v as 'clicks' | 'conversions' | 'revenue')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clicks">点击数</SelectItem>
              <SelectItem value="conversions">转化数</SelectItem>
              <SelectItem value="revenue">收入</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>默认目标值</Label>
          <Input
            type="number"
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            placeholder={goalType === 'revenue' ? '¥ 金额' : '数量'}
          />
          <p className="text-xs text-muted-foreground">留空则不设置默认目标</p>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>活动结束后自动归档</Label>
              <p className="text-xs text-muted-foreground">默认设置</p>
            </div>
            <Checkbox
              checked={formData.settings?.autoArchiveOnEnd}
              onCheckedChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, autoArchiveOnEnd: !!v },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>达成目标时通知</Label>
              <p className="text-xs text-muted-foreground">默认设置</p>
            </div>
            <Checkbox
              checked={formData.settings?.notifyOnGoalReached}
              onCheckedChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, notifyOnGoalReached: !!v },
                }))
              }
            />
          </div>
        </div>
      </TabsContent>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </Tabs>
  );
}
