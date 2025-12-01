import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useGoals,
  useGoalStats,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  usePauseGoal,
  useResumeGoal,
  Goal,
} from '@/hooks/useGoals';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import { EmptyState } from '@/components/EmptyState';
import {
  Target,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pause,
  Play,
  Loader2,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  MousePointerClick,
  DollarSign,
  UserPlus,
  ShoppingCart,
  Settings,
  AlertTriangle,
  Calendar,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const goalTypes = [
  { value: 'clicks', label: '点击量', icon: MousePointerClick },
  { value: 'conversions', label: '转化数', icon: TrendingUp },
  { value: 'revenue', label: '收入', icon: DollarSign },
  { value: 'signups', label: '注册数', icon: UserPlus },
  { value: 'purchases', label: '购买数', icon: ShoppingCart },
  { value: 'custom', label: '自定义', icon: Settings },
];

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onPause,
  onResume,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const goalType = goalTypes.find(t => t.value === goal.type);
  const Icon = goalType?.icon || Target;
  const daysLeft = goal.endDate ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  const isOverdue = daysLeft < 0 && goal.status === 'active';

  const getStatusBadge = () => {
    switch (goal.status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />已完成</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />未达成</Badge>;
      case 'paused':
        return <Badge variant="secondary"><Pause className="h-3 w-3 mr-1" />已暂停</Badge>;
      default:
        if (isOverdue) {
          return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />已过期</Badge>;
        }
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />进行中</Badge>;
    }
  };

  return (
    <Card className={`group hover:shadow-md transition-shadow ${goal.status === 'paused' ? 'opacity-60' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${(goal.progress ?? 0) >= 100 ? 'bg-green-100 text-green-600' : 'bg-muted'}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{goal.name}</h3>
                {getStatusBadge()}
              </div>
              {goal.campaignName && (
                <p className="text-sm text-muted-foreground">活动: {goal.campaignName}</p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {goal.status === 'active' && (
                <DropdownMenuItem onClick={onPause}>
                  <Pause className="h-4 w-4 mr-2" />
                  暂停
                </DropdownMenuItem>
              )}
              {goal.status === 'paused' && (
                <DropdownMenuItem onClick={onResume}>
                  <Play className="h-4 w-4 mr-2" />
                  恢复
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-3">
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>进度</span>
              <span className="font-medium">
                {(goal.currentValue ?? goal.current ?? 0).toLocaleString()} / {(goal.targetValue ?? goal.target ?? 0).toLocaleString()}
                <span className="text-muted-foreground ml-1">({(goal.progress ?? 0).toFixed(1)}%)</span>
              </span>
            </div>
            <Progress
              value={Math.min(goal.progress ?? 0, 100)}
              className={`h-2 ${(goal.progress ?? 0) >= 100 ? '[&>div]:bg-green-500' : (goal.progress ?? 0) >= 75 ? '[&>div]:bg-yellow-500' : ''}`}
            />
          </div>

          {/* 里程碑 */}
          {goal.milestones && goal.milestones.length > 0 && (
            <div className="flex gap-1">
              {goal.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`flex-1 h-1 rounded ${
                    milestone.reached
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                  title={`${milestone.percentage}%`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {goal.startDate ? new Date(goal.startDate).toLocaleDateString() : '-'} - {goal.endDate ? new Date(goal.endDate).toLocaleDateString() : '-'}
          </span>
          {goal.status === 'active' && (
            <span className={daysLeft < 7 ? 'text-red-600 font-medium' : ''}>
              {daysLeft > 0 ? `剩余 ${daysLeft} 天` : '已过期'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GoalsPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaignId: '',
    type: 'clicks' as Goal['type'],
    targetValue: 1000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notifyOnComplete: true,
    notifyOnMilestone: true,
    milestones: [25, 50, 75, 100],
  });

  // Pagination & sorting state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'target' | 'current' | 'deadline'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'reached' | 'failed' | 'paused'>('all');

  const { data: goalsData, isLoading } = useGoals({
    search: search || undefined,
    page,
    limit,
    sortBy,
    sortOrder,
    status: statusFilter === 'all' ? undefined : statusFilter as any,
  });
  const goals = goalsData?.items || [];
  const totalPages = goalsData ? Math.ceil(goalsData.total / limit) : 1;

  const { data: stats } = useGoalStats();
  const { data: campaigns } = useCampaigns();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const pauseGoal = usePauseGoal();
  const resumeGoal = useResumeGoal();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      campaignId: '',
      type: 'clicks',
      targetValue: 1000,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notifyOnComplete: true,
      notifyOnMilestone: true,
      milestones: [25, 50, 75, 100],
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: '请输入目标名称', variant: 'destructive' });
      return;
    }

    createGoal.mutate({
      name: formData.name,
      campaignId: formData.campaignId,
      type: formData.type,
      target: formData.targetValue,
      deadline: formData.endDate,
      metadata: {
        description: formData.description,
      },
    }, {
      onSuccess: () => {
        toast({ title: '目标已创建' });
        setIsCreateOpen(false);
        resetForm();
      },
    });
  };

  const handleEdit = () => {
    if (!editingGoal || !formData.name.trim()) return;

    updateGoal.mutate({
      id: editingGoal.id,
      data: {
        name: formData.name,
        target: formData.targetValue,
        deadline: formData.endDate,
        metadata: {
          description: formData.description,
        },
      },
    }, {
      onSuccess: () => {
        toast({ title: '目标已更新' });
        setEditingGoal(null);
        resetForm();
      },
    });
  };

  const handleDelete = () => {
    if (!deletingGoal) return;

    deleteGoal.mutate(deletingGoal.id, {
      onSuccess: () => {
        toast({ title: '目标已删除' });
        setDeletingGoal(null);
      },
    });
  };

  const handlePause = (goal: Goal) => {
    pauseGoal.mutate(goal.id, {
      onSuccess: () => {
        toast({ title: '目标已暂停' });
      },
    });
  };

  const handleResume = (goal: Goal) => {
    resumeGoal.mutate(goal.id, {
      onSuccess: () => {
        toast({ title: '目标已恢复' });
      },
    });
  };

  const openEditDialog = (goal: Goal) => {
    setFormData({
      name: goal.name,
      description: goal.description || goal.metadata?.description || '',
      campaignId: goal.campaignId || '',
      type: goal.type,
      targetValue: goal.targetValue ?? goal.target ?? 0,
      startDate: goal.startDate ? goal.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: goal.endDate ? goal.endDate.split('T')[0] : goal.deadline ? goal.deadline.split('T')[0] : new Date().toISOString().split('T')[0],
      notifyOnComplete: goal.thresholds?.some(t => t.percentage === 100) ?? true,
      notifyOnMilestone: (goal.thresholds?.length ?? 0) > 1,
      milestones: goal.milestones?.map(m => m.percentage) ?? [25, 50, 75, 100],
    });
    setEditingGoal(goal);
  };

  // 当有状态筛选时不分组，直接显示所有
  const activeGoals = statusFilter === 'all' ? goals.filter(g => g.status === 'active') : [];
  const completedGoals = statusFilter === 'all' ? goals.filter(g => g.status === 'completed' || g.status === 'reached') : [];
  const otherGoals = statusFilter === 'all' ? goals.filter(g => g.status !== 'active' && g.status !== 'completed' && g.status !== 'reached') : [];

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
            <h1 className="text-3xl font-bold">活动目标</h1>
            <p className="text-muted-foreground mt-1">设置和追踪您的营销目标</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建目标
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>创建目标</DialogTitle>
                <DialogDescription>设置一个新的营销目标来追踪进度</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">目标名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：Q4点击量目标"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">描述（可选）</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述这个目标"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>目标类型</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as Goal['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {goalTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetValue">目标值</Label>
                    <Input
                      id="targetValue"
                      type="number"
                      value={formData.targetValue}
                      onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>关联活动（可选）</Label>
                  <Select
                    value={formData.campaignId}
                    onValueChange={(value) => setFormData({ ...formData, campaignId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择活动" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">不关联</SelectItem>
                      {campaigns?.items?.map((campaign: Campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">开始日期</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">结束日期</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>完成时通知</Label>
                      <p className="text-sm text-muted-foreground">目标达成时发送通知</p>
                    </div>
                    <Switch
                      checked={formData.notifyOnComplete}
                      onCheckedChange={(checked) => setFormData({ ...formData, notifyOnComplete: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>里程碑通知</Label>
                      <p className="text-sm text-muted-foreground">达到25%、50%、75%时通知</p>
                    </div>
                    <Switch
                      checked={formData.notifyOnMilestone}
                      onCheckedChange={(checked) => setFormData({ ...formData, notifyOnMilestone: checked })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={createGoal.isPending}>
                  {createGoal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalGoals}</p>
                    <p className="text-sm text-muted-foreground">总目标数</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.activeGoals}</p>
                    <p className="text-sm text-muted-foreground">进行中</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completedGoals}</p>
                    <p className="text-sm text-muted-foreground">已完成</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.averageProgress.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">平均进度</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索目标名称..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => { setStatusFilter(value as typeof statusFilter); setPage(1); }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">进行中</SelectItem>
              <SelectItem value="reached">已达成</SelectItem>
              <SelectItem value="failed">未达成</SelectItem>
              <SelectItem value="paused">已暂停</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as typeof sortBy);
              setSortOrder(order as 'ASC' | 'DESC');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-DESC">最新创建</SelectItem>
              <SelectItem value="createdAt-ASC">最早创建</SelectItem>
              <SelectItem value="name-ASC">名称 A-Z</SelectItem>
              <SelectItem value="name-DESC">名称 Z-A</SelectItem>
              <SelectItem value="target-DESC">目标值（高→低）</SelectItem>
              <SelectItem value="target-ASC">目标值（低→高）</SelectItem>
              <SelectItem value="current-DESC">当前进度（高→低）</SelectItem>
              <SelectItem value="current-ASC">当前进度（低→高）</SelectItem>
              <SelectItem value="deadline-ASC">截止日期（近→远）</SelectItem>
              <SelectItem value="deadline-DESC">截止日期（远→近）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="还没有目标"
            description="创建目标来追踪您的营销进度"
            action={{
              label: '创建第一个目标',
              onClick: () => setIsCreateOpen(true),
              icon: Plus,
            }}
          />
        ) : statusFilter !== 'all' || search ? (
          // 有筛选/搜索条件时，不分组显示
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {goalsData?.total || 0} 个结果</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEditDialog(goal)}
                  onDelete={() => setDeletingGoal(goal)}
                  onPause={() => handlePause(goal)}
                  onResume={() => handleResume(goal)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 进行中的目标 */}
            {activeGoals && activeGoals.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  进行中 ({activeGoals.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={() => openEditDialog(goal)}
                      onDelete={() => setDeletingGoal(goal)}
                      onPause={() => handlePause(goal)}
                      onResume={() => handleResume(goal)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 已完成的目标 */}
            {completedGoals && completedGoals.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  已完成 ({completedGoals.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={() => openEditDialog(goal)}
                      onDelete={() => setDeletingGoal(goal)}
                      onPause={() => handlePause(goal)}
                      onResume={() => handleResume(goal)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 其他目标 */}
            {otherGoals && otherGoals.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">其他 ({otherGoals.length})</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {otherGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={() => openEditDialog(goal)}
                      onDelete={() => setDeletingGoal(goal)}
                      onPause={() => handlePause(goal)}
                      onResume={() => handleResume(goal)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={!!editingGoal} onOpenChange={() => { setEditingGoal(null); resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑目标</DialogTitle>
            <DialogDescription>修改目标设置</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">目标名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">描述（可选）</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>目标类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as Goal['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-targetValue">目标值</Label>
                <Input
                  id="edit-targetValue"
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">结束日期</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGoal(null)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={updateGoal.isPending}>
              {updateGoal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deletingGoal} onOpenChange={() => setDeletingGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除目标？</AlertDialogTitle>
            <AlertDialogDescription>
              删除 "{deletingGoal?.name}" 后将无法恢复。历史数据也将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
