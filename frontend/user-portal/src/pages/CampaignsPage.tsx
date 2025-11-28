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
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import {
  useCampaigns,
  useCampaignStats,
  useCreateCampaign,
  useUpdateCampaign,
  useStartCampaign,
  usePauseCampaign,
  useCompleteCampaign,
  useArchiveCampaign,
  useDuplicateCampaign,
  useDeleteCampaign,
  CAMPAIGN_STATUS_CONFIG,
  CAMPAIGN_TYPE_CONFIG,
  CHANNEL_OPTIONS,
  CampaignStatus,
  CampaignType,
  type Campaign,
  type CreateCampaignData,
} from '@/hooks/useCampaigns';
import {
  Plus,
  Megaphone,
  Play,
  Pause,
  CheckCircle,
  Archive,
  Copy,
  Trash2,
  Loader2,
  Target,
  Calendar,
  DollarSign,
  MousePointer,
  TrendingUp,
  Link2,
  BarChart3,
  Pencil,
  AlertTriangle,
  Eye,
} from 'lucide-react';

export default function CampaignsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const { data: campaigns, isLoading } = useCampaigns(
    statusFilter === 'all' ? undefined : statusFilter
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);
  const [viewStatsCampaign, setViewStatsCampaign] = useState<Campaign | null>(null);

  const { data: stats } = useCampaignStats(viewStatsCampaign?.id || null);

  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();
  const completeCampaign = useCompleteCampaign();
  const archiveCampaign = useArchiveCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const deleteCampaignMutation = useDeleteCampaign();

  const [formData, setFormData] = useState<CreateCampaignData>({
    name: '',
    description: '',
    type: CampaignType.MARKETING,
    channels: [],
    utmParams: {},
    startDate: '',
    endDate: '',
    budget: undefined,
    tags: [],
    goal: undefined,
    settings: {
      autoArchiveOnEnd: true,
      notifyOnGoalReached: true,
    },
  });

  const [tagsInput, setTagsInput] = useState('');
  const [goalType, setGoalType] = useState<'clicks' | 'conversions' | 'revenue'>('clicks');
  const [goalTarget, setGoalTarget] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: CampaignType.MARKETING,
      channels: [],
      utmParams: {},
      startDate: '',
      endDate: '',
      budget: undefined,
      tags: [],
      goal: undefined,
      settings: {
        autoArchiveOnEnd: true,
        notifyOnGoalReached: true,
      },
    });
    setTagsInput('');
    setGoalType('clicks');
    setGoalTarget('');
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast({ title: '请填写活动名称', variant: 'destructive' });
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
      await createCampaign.mutateAsync(data);
      toast({ title: '活动已创建' });
      setIsAddDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editCampaign) return;

    try {
      const data = {
        ...formData,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        goal: goalTarget
          ? { type: goalType, target: parseInt(goalTarget) }
          : undefined,
      };
      await updateCampaign.mutateAsync({ id: editCampaign.id, data });
      toast({ title: '活动已更新' });
      setEditCampaign(null);
      resetForm();
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (campaign: Campaign, action: string) => {
    try {
      switch (action) {
        case 'start':
          await startCampaign.mutateAsync(campaign.id);
          toast({ title: '活动已启动' });
          break;
        case 'pause':
          await pauseCampaign.mutateAsync(campaign.id);
          toast({ title: '活动已暂停' });
          break;
        case 'complete':
          await completeCampaign.mutateAsync(campaign.id);
          toast({ title: '活动已完成' });
          break;
        case 'archive':
          await archiveCampaign.mutateAsync(campaign.id);
          toast({ title: '活动已归档' });
          break;
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateCampaign.mutateAsync(id);
      toast({ title: '活动已复制' });
    } catch {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteCampaign) return;
    try {
      await deleteCampaignMutation.mutateAsync(deleteCampaign.id);
      toast({ title: '活动已删除' });
      setDeleteCampaign(null);
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      type: campaign.type,
      channels: campaign.channels,
      utmParams: campaign.utmParams,
      startDate: campaign.startDate?.split('T')[0] || '',
      endDate: campaign.endDate?.split('T')[0] || '',
      budget: campaign.budget,
      tags: campaign.tags,
      settings: campaign.settings,
    });
    setTagsInput(campaign.tags.join(', '));
    if (campaign.goal) {
      setGoalType(campaign.goal.type);
      setGoalTarget(campaign.goal.target.toString());
    }
    setEditCampaign(campaign);
  };

  const toggleChannel = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels?.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...(prev.channels || []), channel],
    }));
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '-';
    return `¥${amount.toLocaleString()}`;
  };

  const getGoalProgress = (campaign: Campaign) => {
    if (!campaign.goal) return null;
    const progress = (campaign.goal.current / campaign.goal.target) * 100;
    return Math.min(progress, 100);
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
            <h1 className="text-2xl font-bold">营销活动</h1>
            <p className="text-gray-500">管理和跟踪您的营销活动效果</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                创建活动
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建营销活动</DialogTitle>
              </DialogHeader>
              <CampaignForm
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
                isSubmitting={createCampaign.isPending}
                submitLabel="创建"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as CampaignStatus | 'all')}
          >
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value={CampaignStatus.ACTIVE}>进行中</TabsTrigger>
              <TabsTrigger value={CampaignStatus.DRAFT}>草稿</TabsTrigger>
              <TabsTrigger value={CampaignStatus.PAUSED}>已暂停</TabsTrigger>
              <TabsTrigger value={CampaignStatus.COMPLETED}>已完成</TabsTrigger>
              <TabsTrigger value={CampaignStatus.ARCHIVED}>已归档</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Campaigns List */}
        {!campaigns?.length ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={Megaphone}
                title="暂无营销活动"
                description="创建活动来跟踪和管理您的营销效果"
                action={{
                  label: '创建活动',
                  onClick: () => setIsAddDialogOpen(true),
                  icon: Plus,
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const statusConfig = CAMPAIGN_STATUS_CONFIG[campaign.status];
              const typeConfig = CAMPAIGN_TYPE_CONFIG[campaign.type];
              const goalProgress = getGoalProgress(campaign);

              return (
                <Card key={campaign.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="border-b p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium line-clamp-1">
                              {campaign.name}
                            </h3>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {typeConfig.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      {campaign.description && (
                        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 border-b p-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold">
                          {campaign.totalClicks.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">点击</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">
                          {campaign.conversions.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">转化</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">
                          {campaign.totalLinks}
                        </p>
                        <p className="text-xs text-gray-500">链接</p>
                      </div>
                    </div>

                    {/* Goal Progress */}
                    {goalProgress !== null && (
                      <div className="border-b px-4 py-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            目标进度 ({campaign.goal?.type})
                          </span>
                          <span className="font-medium">
                            {campaign.goal?.current} / {campaign.goal?.target}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${
                              goalProgress >= 100
                                ? 'bg-green-500'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${goalProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        {campaign.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(campaign.startDate)}
                          </span>
                        )}
                        {campaign.budget !== undefined && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(campaign.budget)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-2">
                      <div className="flex items-center gap-1">
                        {campaign.status === CampaignStatus.DRAFT && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(campaign, 'start')}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === CampaignStatus.ACTIVE && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(campaign, 'pause')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(campaign, 'complete')
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {campaign.status === CampaignStatus.PAUSED && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(campaign, 'start')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(campaign, 'complete')
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {campaign.status === CampaignStatus.COMPLETED && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(campaign, 'archive')}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewStatsCampaign(campaign)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(campaign)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(campaign.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCampaign(campaign)}
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
          open={!!editCampaign}
          onOpenChange={() => {
            setEditCampaign(null);
            resetForm();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑活动</DialogTitle>
            </DialogHeader>
            <CampaignForm
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
              isSubmitting={updateCampaign.isPending}
              submitLabel="保存"
            />
          </DialogContent>
        </Dialog>

        {/* Stats Sheet */}
        <Sheet
          open={!!viewStatsCampaign}
          onOpenChange={() => setViewStatsCampaign(null)}
        >
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{viewStatsCampaign?.name} - 统计数据</SheetTitle>
            </SheetHeader>
            {stats ? (
              <div className="mt-6 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <MousePointer className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">
                            {stats.totalClicks.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">总点击</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">
                            {stats.conversions.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">转化</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Links */}
                {stats.topLinks?.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      热门链接
                    </h4>
                    <div className="space-y-2">
                      {stats.topLinks.map((link, i) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between rounded bg-gray-50 p-2"
                        >
                          <span className="text-sm truncate flex-1">
                            {i + 1}. {link.shortUrl}
                          </span>
                          <span className="text-sm font-medium">
                            {link.clicks.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Countries */}
                {stats.topCountries?.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      地理分布
                    </h4>
                    <div className="space-y-2">
                      {stats.topCountries.map((item) => (
                        <div
                          key={item.country}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{item.country}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded bg-gray-100">
                              <div
                                className="h-full rounded bg-primary"
                                style={{
                                  width: `${(item.clicks / stats.totalClicks) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {item.clicks}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteCampaign}
          onOpenChange={() => setDeleteCampaign(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                确认删除
              </AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除活动 "{deleteCampaign?.name}" 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteCampaignMutation.isPending && (
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

// Campaign Form Component
function CampaignForm({
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
  formData: CreateCampaignData;
  setFormData: React.Dispatch<React.SetStateAction<CreateCampaignData>>;
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
        <TabsTrigger value="goal">目标设置</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        <div className="space-y-2">
          <Label>活动名称 *</Label>
          <Input
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="例如: 2024春季促销活动"
          />
        </div>

        <div className="space-y-2">
          <Label>描述</Label>
          <Textarea
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="活动描述..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>活动类型</Label>
            <Select
              value={formData.type}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, type: v as CampaignType }))
              }
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
            <Label>预算</Label>
            <Input
              type="number"
              value={formData.budget || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  budget: e.target.value ? parseFloat(e.target.value) : undefined,
                }))
              }
              placeholder="¥"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>开始日期</Label>
            <Input
              type="date"
              value={formData.startDate || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>结束日期</Label>
            <Input
              type="date"
              value={formData.endDate || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>渠道</Label>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((channel) => (
              <label
                key={channel.value}
                className="flex items-center gap-1.5 cursor-pointer"
              >
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
      </TabsContent>

      <TabsContent value="tracking" className="space-y-4">
        <p className="text-sm text-gray-500">
          UTM 参数将自动添加到活动中的所有链接
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
            placeholder="例如: spring_sale"
          />
        </div>

        <div className="space-y-2">
          <Label>utm_term (可选)</Label>
          <Input
            value={formData.utmParams?.term || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                utmParams: { ...prev.utmParams, term: e.target.value },
              }))
            }
            placeholder="付费搜索关键词"
          />
        </div>

        <div className="space-y-2">
          <Label>utm_content (可选)</Label>
          <Input
            value={formData.utmParams?.content || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                utmParams: { ...prev.utmParams, content: e.target.value },
              }))
            }
            placeholder="用于 A/B 测试"
          />
        </div>
      </TabsContent>

      <TabsContent value="goal" className="space-y-4">
        <div className="space-y-2">
          <Label>目标类型</Label>
          <Select
            value={goalType}
            onValueChange={(v) =>
              setGoalType(v as 'clicks' | 'conversions' | 'revenue')
            }
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
          <Label>目标值</Label>
          <Input
            type="number"
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            placeholder={goalType === 'revenue' ? '¥ 金额' : '数量'}
          />
          <p className="text-xs text-gray-500">
            留空则不设置目标
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>活动结束后自动归档</Label>
              <p className="text-xs text-gray-500">到达结束日期后自动归档</p>
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
              <p className="text-xs text-gray-500">目标完成时发送通知</p>
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
