import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Workflow,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Pause,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  History,
  Zap,
  Settings,
  ArrowRight,
  RefreshCw,
  Mail,
  Webhook,
  Database,
  FileText,
  Tag,
  Link2,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger: {
    type: 'event' | 'schedule' | 'manual' | 'webhook';
    config: Record<string, any>;
  };
  actions: {
    type: string;
    config: Record<string, any>;
  }[];
  conditions?: {
    field: string;
    operator: string;
    value: any;
  }[];
  enabled: boolean;
  executionCount: number;
  lastExecuted?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  createdAt: string;
  updatedAt: string;
}

interface ExecutionLog {
  id: string;
  workflowId: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  completedAt?: string;
  error?: string;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
}

const TRIGGER_TYPES = [
  { value: 'event', label: '事件触发', icon: Zap, description: '当特定事件发生时触发' },
  { value: 'schedule', label: '定时任务', icon: Clock, description: '按设定的时间计划执行' },
  { value: 'manual', label: '手动触发', icon: Play, description: '手动运行工作流' },
  { value: 'webhook', label: 'Webhook', icon: Webhook, description: '接收外部 HTTP 请求触发' },
];

const EVENT_TYPES = [
  { value: 'link.created', label: '链接创建' },
  { value: 'link.clicked', label: '链接点击' },
  { value: 'link.threshold', label: '点击阈值' },
  { value: 'user.registered', label: '用户注册' },
  { value: 'user.upgraded', label: '用户升级' },
  { value: 'team.created', label: '团队创建' },
  { value: 'quota.exceeded', label: '配额超限' },
  { value: 'security.threat', label: '安全威胁' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: '发送邮件', icon: Mail },
  { value: 'send_webhook', label: '调用 Webhook', icon: Webhook },
  { value: 'update_link', label: '更新链接', icon: Link2 },
  { value: 'add_tag', label: '添加标签', icon: Tag },
  { value: 'create_report', label: '生成报告', icon: FileText },
  { value: 'notify_team', label: '通知团队', icon: Users },
  { value: 'log_event', label: '记录日志', icon: Database },
];

export default function AutomationWorkflowPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<AutomationWorkflow | null>(null);
  const [logsSheetOpen, setLogsSheetOpen] = useState(false);
  const [selectedWorkflowLogs, setSelectedWorkflowLogs] = useState<AutomationWorkflow | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'event' as AutomationWorkflow['trigger']['type'],
    eventType: '',
    cronExpression: '',
    enabled: true,
    actions: [{ type: '', config: {} }],
  });

  // Fetch workflows
  const { data: workflowsData, isLoading } = useQuery({
    queryKey: ['automation-workflows', searchQuery, filterTrigger, filterStatus],
    queryFn: async () => {
      const response = await api.get('/system/automation', {
        params: {
          search: searchQuery || undefined,
          trigger: filterTrigger !== 'all' ? filterTrigger : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
        },
      });
      return response.data;
    },
  });

  // Fetch execution logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['automation-logs', selectedWorkflowLogs?.id],
    queryFn: async () => {
      if (!selectedWorkflowLogs) return { data: [] };
      const response = await api.get(`/system/automation/${selectedWorkflowLogs.id}/logs`);
      return response.data;
    },
    enabled: !!selectedWorkflowLogs,
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: async () => {
      const response = await api.get('/system/automation/stats');
      return response.data;
    },
  });

  const workflows: AutomationWorkflow[] = workflowsData?.items || [];
  const logs: ExecutionLog[] = logsData?.items || [];
  const stats = {
    totalWorkflows: statsData?.total || 0,
    activeWorkflows: statsData?.enabled || 0,
    executionsToday: statsData?.last24h?.success || 0,
    failedToday: statsData?.last24h?.failed || 0,
  };

  // Create workflow mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        description: data.description,
        trigger: {
          type: data.triggerType,
          config: data.triggerType === 'event'
            ? { eventType: data.eventType }
            : data.triggerType === 'schedule'
            ? { cronExpression: data.cronExpression }
            : {},
        },
        actions: data.actions.filter((a) => a.type),
        enabled: data.enabled,
      };
      const response = await api.post('/system/automation', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-stats'] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: '成功', description: '工作流创建成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '创建失败', variant: 'destructive' });
    },
  });

  // Update workflow mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const payload = {
        name: data.name,
        description: data.description,
        trigger: {
          type: data.triggerType,
          config: data.triggerType === 'event'
            ? { eventType: data.eventType }
            : data.triggerType === 'schedule'
            ? { cronExpression: data.cronExpression }
            : {},
        },
        actions: data.actions.filter((a) => a.type),
        enabled: data.enabled,
      };
      const response = await api.put(`/system/automation/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      setEditingWorkflow(null);
      resetForm();
      toast({ title: '成功', description: '工作流更新成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' });
    },
  });

  // Toggle workflow mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id }: { id: string; enabled: boolean }) => {
      const response = await api.post(`/system/automation/${id}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-stats'] });
    },
    onError: () => {
      toast({ title: '错误', description: '操作失败', variant: 'destructive' });
    },
  });

  // Run workflow mutation
  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/system/automation/${id}/execute`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast({ title: '成功', description: '工作流已开始执行' });
    },
    onError: () => {
      toast({ title: '错误', description: '执行失败', variant: 'destructive' });
    },
  });

  // Delete workflow mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/system/automation/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-stats'] });
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
      toast({ title: '成功', description: '工作流删除成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerType: 'event',
      eventType: '',
      cronExpression: '',
      enabled: true,
      actions: [{ type: '', config: {} }],
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (workflow: AutomationWorkflow) => {
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
      triggerType: workflow.trigger.type,
      eventType: workflow.trigger.config.eventType || '',
      cronExpression: workflow.trigger.config.cronExpression || '',
      enabled: workflow.enabled,
      actions: workflow.actions.length > 0 ? workflow.actions : [{ type: '', config: {} }],
    });
    setEditingWorkflow(workflow);
  };

  const handleViewLogs = (workflow: AutomationWorkflow) => {
    setSelectedWorkflowLogs(workflow);
    setLogsSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入工作流名称', variant: 'destructive' });
      return;
    }

    if (editingWorkflow) {
      updateMutation.mutate({ id: editingWorkflow.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (workflow: AutomationWorkflow) => {
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (workflowToDelete) {
      deleteMutation.mutate(workflowToDelete.id);
    }
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { type: '', config: {} }],
    });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
  };

  const updateAction = (index: number, type: string) => {
    const newActions = [...formData.actions];
    newActions[index] = { type, config: {} };
    setFormData({ ...formData, actions: newActions });
  };

  const getTriggerIcon = (type: string) => {
    const trigger = TRIGGER_TYPES.find((t) => t.value === type);
    if (trigger) {
      const Icon = trigger.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Workflow className="h-4 w-4" />;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">成功</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      case 'running':
        return <Badge variant="secondary">运行中</Badge>;
      default:
        return <Badge variant="outline">未执行</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">自动化工作流</h1>
          <p className="text-muted-foreground">
            创建和管理自动化规则和工作流
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          创建工作流
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">工作流总数</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkflows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃工作流</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.activeWorkflows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日执行</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.executionsToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">执行失败</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failedToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索工作流..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterTrigger} onValueChange={setFilterTrigger}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="触发类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有类型</SelectItem>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有状态</SelectItem>
                  <SelectItem value="enabled">已启用</SelectItem>
                  <SelectItem value="disabled">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Table */}
      <Card>
        <CardHeader>
          <CardTitle>工作流列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无工作流</h3>
              <p className="text-muted-foreground text-center mb-4">
                创建自动化工作流来提高效率
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                创建工作流
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工作流名称</TableHead>
                  <TableHead>触发方式</TableHead>
                  <TableHead>操作数</TableHead>
                  <TableHead>执行次数</TableHead>
                  <TableHead>最近状态</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        {workflow.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTriggerIcon(workflow.trigger.type)}
                        <span className="text-sm">
                          {TRIGGER_TYPES.find((t) => t.value === workflow.trigger.type)?.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{workflow.actions.length} 个操作</Badge>
                    </TableCell>
                    <TableCell>{workflow.executionCount.toLocaleString()}</TableCell>
                    <TableCell>
                      {getStatusBadge(workflow.lastStatus)}
                      {workflow.lastExecuted && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(workflow.lastExecuted).toLocaleString()}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={workflow.enabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: workflow.id, enabled: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => runMutation.mutate(workflow.id)}>
                            <Play className="mr-2 h-4 w-4" />
                            立即执行
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewLogs(workflow)}>
                            <History className="mr-2 h-4 w-4" />
                            执行日志
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenEdit(workflow)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            复制
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(workflow)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editingWorkflow}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingWorkflow(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? '编辑工作流' : '创建工作流'}
            </DialogTitle>
            <DialogDescription>
              配置自动化工作流的触发条件和执行操作
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium">基本信息</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>工作流名称 *</Label>
                  <Input
                    placeholder="例如: 新链接通知"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>启用状态</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={formData.enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {formData.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  placeholder="工作流说明..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Trigger */}
            <div className="space-y-4">
              <h4 className="font-medium">触发条件</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>触发类型</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(v) => setFormData({ ...formData, triggerType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((type) => (
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
                {formData.triggerType === 'event' && (
                  <div className="space-y-2">
                    <Label>事件类型</Label>
                    <Select
                      value={formData.eventType}
                      onValueChange={(v) => setFormData({ ...formData, eventType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择事件" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((event) => (
                          <SelectItem key={event.value} value={event.value}>
                            {event.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.triggerType === 'schedule' && (
                  <div className="space-y-2">
                    <Label>Cron 表达式</Label>
                    <Input
                      placeholder="0 0 * * *"
                      value={formData.cronExpression}
                      onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      例如: 0 0 * * * (每天 0 点)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">执行操作</h4>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加操作
                </Button>
              </div>
              <div className="space-y-3">
                {formData.actions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </div>
                    <Select
                      value={action.type}
                      onValueChange={(v) => updateAction(index, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="选择操作" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((act) => (
                          <SelectItem key={act.value} value={act.value}>
                            <div className="flex items-center gap-2">
                              <act.icon className="h-4 w-4" />
                              {act.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAction(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingWorkflow(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {editingWorkflow ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除工作流 "{workflowToDelete?.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Sheet */}
      <Sheet open={logsSheetOpen} onOpenChange={setLogsSheetOpen}>
        <SheetContent className="w-[500px] sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>执行日志</SheetTitle>
            <SheetDescription>
              {selectedWorkflowLogs?.name}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无执行记录
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(log.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.startedAt).toLocaleString()}
                    </span>
                  </div>
                  {log.error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {log.error}
                    </div>
                  )}
                  {log.completedAt && (
                    <div className="text-xs text-muted-foreground">
                      耗时: {(new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000}s
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
