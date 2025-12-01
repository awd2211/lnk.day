import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Copy,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Webhook,
  Loader2,
  Filter,
  Activity,
  TrendingUp,
  Users,
  Server,
  Database,
  Shield,
  Zap,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface AlertRule {
  id: string;
  name: string;
  description?: string;
  type: 'threshold' | 'anomaly' | 'pattern' | 'health';
  metric: string;
  condition: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    duration?: number;
  };
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  channels: ('email' | 'slack' | 'webhook')[];
  recipients?: string[];
  cooldownMinutes: number;
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
}

const ALERT_TYPES = [
  { value: 'threshold', label: '阈值告警', icon: TrendingUp, description: '当指标超过设定阈值时触发' },
  { value: 'anomaly', label: '异常检测', icon: Activity, description: '基于历史数据检测异常波动' },
  { value: 'pattern', label: '模式匹配', icon: Zap, description: '当检测到特定模式时触发' },
  { value: 'health', label: '健康检查', icon: Server, description: '服务健康状态监控' },
];

const METRICS = [
  { value: 'error_rate', label: '错误率', category: '系统' },
  { value: 'response_time', label: '响应时间', category: '系统' },
  { value: 'cpu_usage', label: 'CPU 使用率', category: '资源' },
  { value: 'memory_usage', label: '内存使用率', category: '资源' },
  { value: 'disk_usage', label: '磁盘使用率', category: '资源' },
  { value: 'request_rate', label: '请求频率', category: '流量' },
  { value: 'click_rate', label: '点击率', category: '业务' },
  { value: 'user_signups', label: '用户注册', category: '业务' },
  { value: 'link_creation', label: '链接创建', category: '业务' },
  { value: 'api_errors', label: 'API 错误', category: '系统' },
  { value: 'security_events', label: '安全事件', category: '安全' },
];

const OPERATORS = [
  { value: 'gt', label: '大于 (>)' },
  { value: 'gte', label: '大于等于 (>=)' },
  { value: 'lt', label: '小于 (<)' },
  { value: 'lte', label: '小于等于 (<=)' },
  { value: 'eq', label: '等于 (=)' },
];

const SEVERITIES = [
  { value: 'info', label: '信息', color: 'bg-blue-500' },
  { value: 'warning', label: '警告', color: 'bg-orange-500' },
  { value: 'critical', label: '严重', color: 'bg-destructive' },
];

export default function AlertRulesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<AlertRule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'threshold' as AlertRule['type'],
    metric: '',
    operator: 'gt' as AlertRule['condition']['operator'],
    value: 0,
    duration: 5,
    severity: 'warning' as AlertRule['severity'],
    enabled: true,
    channels: ['email'] as AlertRule['channels'],
    recipients: '',
    cooldownMinutes: 15,
  });

  // Fetch alert rules
  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['alert-rules', searchQuery, filterType, filterSeverity],
    queryFn: async () => {
      const response = await api.get('/api/v1/system/alert-rules', {
        params: {
          search: searchQuery || undefined,
          type: filterType !== 'all' ? filterType : undefined,
          severity: filterSeverity !== 'all' ? filterSeverity : undefined,
        },
      });
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['alert-rules-stats'],
    queryFn: async () => {
      const response = await api.get('/api/v1/system/alert-rules/stats');
      return response.data;
    },
  });

  const rules: AlertRule[] = rulesData?.data || [];
  const stats = statsData || {
    totalRules: 24,
    activeRules: 18,
    triggeredToday: 5,
    criticalAlerts: 2,
  };

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/api/v1/system/alert-rules', {
        ...data,
        condition: {
          operator: data.operator,
          value: data.value,
          duration: data.duration,
        },
        recipients: data.recipients.split(',').map((r) => r.trim()).filter(Boolean),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      queryClient.invalidateQueries({ queryKey: ['alert-rules-stats'] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: '成功', description: '告警规则创建成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '创建失败', variant: 'destructive' });
    },
  });

  // Update rule mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.put(`/api/v1/system/alert-rules/${id}`, {
        ...data,
        condition: {
          operator: data.operator,
          value: data.value,
          duration: data.duration,
        },
        recipients: data.recipients.split(',').map((r) => r.trim()).filter(Boolean),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setEditingRule(null);
      resetForm();
      toast({ title: '成功', description: '规则更新成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' });
    },
  });

  // Toggle rule mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await api.patch(`/api/v1/system/alert-rules/${id}/toggle`, { enabled });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      queryClient.invalidateQueries({ queryKey: ['alert-rules-stats'] });
    },
    onError: () => {
      toast({ title: '错误', description: '操作失败', variant: 'destructive' });
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/system/alert-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      queryClient.invalidateQueries({ queryKey: ['alert-rules-stats'] });
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      toast({ title: '成功', description: '规则删除成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'threshold',
      metric: '',
      operator: 'gt',
      value: 0,
      duration: 5,
      severity: 'warning',
      enabled: true,
      channels: ['email'],
      recipients: '',
      cooldownMinutes: 15,
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (rule: AlertRule) => {
    setFormData({
      name: rule.name,
      description: rule.description || '',
      type: rule.type,
      metric: rule.metric,
      operator: rule.condition.operator,
      value: rule.condition.value,
      duration: rule.condition.duration || 5,
      severity: rule.severity,
      enabled: rule.enabled,
      channels: rule.channels,
      recipients: rule.recipients?.join(', ') || '',
      cooldownMinutes: rule.cooldownMinutes,
    });
    setEditingRule(rule);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入规则名称', variant: 'destructive' });
      return;
    }
    if (!formData.metric) {
      toast({ title: '错误', description: '请选择监控指标', variant: 'destructive' });
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (rule: AlertRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (ruleToDelete) {
      deleteMutation.mutate(ruleToDelete.id);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">严重</Badge>;
      case 'warning':
        return <Badge className="bg-orange-500">警告</Badge>;
      default:
        return <Badge variant="secondary">信息</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    const alertType = ALERT_TYPES.find((t) => t.value === type);
    if (alertType) {
      const Icon = alertType.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Bell className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">告警规则</h1>
          <p className="text-muted-foreground">
            配置系统告警规则和通知设置
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          创建规则
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">规则总数</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃规则</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.activeRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日触发</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.triggeredToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">严重告警</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.criticalAlerts}</div>
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
                placeholder="搜索规则..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有类型</SelectItem>
                  {ALERT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有级别</SelectItem>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>规则列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无告警规则</h3>
              <p className="text-muted-foreground text-center mb-4">
                创建告警规则来监控系统状态
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                创建规则
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>监控指标</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>级别</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>触发次数</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(rule.type)}
                        <span className="text-sm">
                          {ALERT_TYPES.find((t) => t.value === rule.type)?.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {METRICS.find((m) => m.value === rule.metric)?.label || rule.metric}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {OPERATORS.find((o) => o.value === rule.condition.operator)?.label} {rule.condition.value}
                      </code>
                    </TableCell>
                    <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: rule.id, enabled: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{rule.triggerCount}</span>
                        {rule.lastTriggered && (
                          <p className="text-xs text-muted-foreground">
                            上次: {new Date(rule.lastTriggered).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(rule)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            复制
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(rule)}
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
        open={createDialogOpen || !!editingRule}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingRule(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? '编辑告警规则' : '创建告警规则'}
            </DialogTitle>
            <DialogDescription>
              配置告警条件和通知方式
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="condition">触发条件</TabsTrigger>
              <TabsTrigger value="notification">通知设置</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label>规则名称 *</Label>
                <Input
                  placeholder="例如: CPU 使用率告警"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  placeholder="规则说明..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>告警类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as AlertRule['type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map((type) => (
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
                  <Label>严重程度</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(v) => setFormData({ ...formData, severity: v as AlertRule['severity'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="condition" className="space-y-4">
              <div className="space-y-2">
                <Label>监控指标 *</Label>
                <Select
                  value={formData.metric}
                  onValueChange={(v) => setFormData({ ...formData, metric: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择指标" />
                  </SelectTrigger>
                  <SelectContent>
                    {METRICS.map((metric) => (
                      <SelectItem key={metric.value} value={metric.value}>
                        <span className="text-muted-foreground mr-2">[{metric.category}]</span>
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>比较运算符</Label>
                  <Select
                    value={formData.operator}
                    onValueChange={(v) => setFormData({ ...formData, operator: v as AlertRule['condition']['operator'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>阈值</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>持续时间 (分钟)</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>冷却时间 (分钟)</Label>
                <Input
                  type="number"
                  value={formData.cooldownMinutes}
                  onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) || 15 })}
                />
                <p className="text-xs text-muted-foreground">
                  告警触发后的静默时间，避免重复告警
                </p>
              </div>
            </TabsContent>

            <TabsContent value="notification" className="space-y-4">
              <div className="space-y-2">
                <Label>通知渠道</Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { key: 'email', label: '邮件', icon: Mail },
                    { key: 'slack', label: 'Slack', icon: MessageSquare },
                    { key: 'webhook', label: 'Webhook', icon: Webhook },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={formData.channels.includes(key as any)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, channels: [...formData.channels, key as any] });
                          } else {
                            setFormData({ ...formData, channels: formData.channels.filter((c) => c !== key) });
                          }
                        }}
                      />
                      <Icon className="h-4 w-4" />
                      <Label>{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>接收人邮箱</Label>
                <Textarea
                  placeholder="admin@example.com, ops@example.com"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  多个邮箱用逗号分隔
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用规则</Label>
                  <p className="text-sm text-muted-foreground">
                    创建后立即生效
                  </p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingRule(null);
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
              {editingRule ? '保存' : '创建'}
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
              确定要删除告警规则 "{ruleToDelete?.name}" 吗？此操作无法撤销。
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
    </div>
  );
}
