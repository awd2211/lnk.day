import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  Settings,
  Plus,
  Trash2,
  Edit,
  Eye,
  Server,
  Cpu,
  Activity,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { alertsService } from '@/lib/api';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  source: 'system' | 'service' | 'security' | 'billing' | 'usage';
  title: string;
  message: string;
  metric?: {
    name: string;
    value: number;
    threshold: number;
    unit: string;
  };
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  channels: ('email' | 'slack' | 'webhook')[];
  cooldown: number;
  createdAt: string;
}

// 后端 severity 到前端 type 的映射
const severityToType = (severity: string): 'error' | 'warning' | 'info' => {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
    default:
      return 'info';
  }
};

// 后端 severity 到前端 severity 的映射
const backendSeverityToFrontend = (severity: string): 'info' | 'warning' | 'critical' => {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'critical';
    case 'medium':
      return 'warning';
    case 'low':
    default:
      return 'info';
  }
};

// 转换后端 Alert 数据到前端格式
const transformAlert = (backendAlert: any): Alert => {
  // 从 metadata 中提取 metric 信息（如果有）
  let metric: Alert['metric'] | undefined;
  if (backendAlert.metadata?.metric) {
    metric = backendAlert.metadata.metric;
  } else if (backendAlert.rule?.conditions?.[0]) {
    const cond = backendAlert.rule.conditions[0];
    metric = {
      name: cond.metric || '',
      value: backendAlert.metadata?.currentValue || 0,
      threshold: typeof cond.value === 'number' ? cond.value : 0,
      unit: backendAlert.metadata?.unit || '',
    };
  }

  return {
    id: backendAlert.id,
    type: severityToType(backendAlert.severity),
    source: backendAlert.source || backendAlert.category || 'system',
    title: backendAlert.title,
    message: backendAlert.description || '',
    metric,
    status: backendAlert.status,
    createdAt: backendAlert.createdAt,
    acknowledgedAt: backendAlert.acknowledgedAt,
    resolvedAt: backendAlert.resolvedAt,
  };
};

// 转换后端 AlertRule 数据到前端格式
const transformRule = (backendRule: any): AlertRule => {
  const firstCondition = backendRule.conditions?.[0] || {};
  return {
    id: backendRule.id,
    name: backendRule.name,
    description: backendRule.description || '',
    metric: firstCondition.metric || '',
    condition: firstCondition.operator || 'gt',
    threshold: typeof firstCondition.value === 'number' ? firstCondition.value : 0,
    severity: backendSeverityToFrontend(backendRule.severity),
    enabled: backendRule.enabled,
    channels: (backendRule.notificationChannels || []) as ('email' | 'slack' | 'webhook')[],
    cooldown: backendRule.cooldownSeconds || 300,
    createdAt: backendRule.createdAt,
  };
};

// 前端 severity 到后端 severity 的映射
const frontendSeverityToBackend = (severity: 'info' | 'warning' | 'critical'): string => {
  switch (severity) {
    case 'critical':
      return 'critical';
    case 'warning':
      return 'medium';
    case 'info':
    default:
      return 'low';
  }
};

// 转换前端 RuleFormData 到后端格式
const transformRuleToBackend = (formData: RuleFormData): any => {
  return {
    name: formData.name,
    description: formData.description,
    type: 'threshold',
    severity: frontendSeverityToBackend(formData.severity),
    conditions: [
      {
        metric: formData.metric,
        operator: formData.condition,
        value: formData.threshold,
      },
    ],
    notificationChannels: formData.channels,
    cooldownSeconds: formData.cooldown,
    enabled: true,
  };
};

interface RuleFormData {
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  channels: ('email' | 'slack' | 'webhook')[];
  cooldown: number;
}

const defaultRuleForm: RuleFormData = {
  name: '',
  description: '',
  metric: '',
  condition: 'gt',
  threshold: 0,
  severity: 'warning',
  channels: ['email'],
  cooldown: 300,
};

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  error: { label: '错误', icon: AlertCircle, color: 'text-red-500 bg-red-100' },
  warning: { label: '警告', icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-100' },
  info: { label: '信息', icon: Info, color: 'text-blue-500 bg-blue-100' },
};

const sourceConfig: Record<string, { label: string; icon: any }> = {
  system: { label: '系统', icon: Server },
  service: { label: '服务', icon: Cpu },
  security: { label: '安全', icon: AlertTriangle },
  billing: { label: '计费', icon: Activity },
  usage: { label: '用量', icon: Zap },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: '活跃', color: 'bg-red-100 text-red-700' },
  acknowledged: { label: '已确认', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-700' },
};

const conditionLabels: Record<string, string> = {
  gt: '大于',
  lt: '小于',
  eq: '等于',
  gte: '大于等于',
  lte: '小于等于',
};

const metricOptions = [
  { value: 'api_latency_p99', label: 'API P99 延迟' },
  { value: 'error_rate_5xx', label: '5xx 错误率' },
  { value: 'cpu_usage', label: 'CPU 使用率' },
  { value: 'memory_usage', label: '内存使用率' },
  { value: 'storage_usage', label: '存储使用率' },
  { value: 'request_count', label: '请求数量' },
];

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<AlertRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormData>(defaultRuleForm);
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', { status: statusFilter }],
    queryFn: async () => {
      const response = await alertsService.getAlerts({
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      const backendAlerts = response.data?.alerts || [];
      return backendAlerts.map(transformAlert);
    },
  });

  // Fetch alert rules
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const response = await alertsService.getRules();
      const backendRules = response.data?.rules || [];
      return backendRules.map(transformRule);
    },
  });

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => alertsService.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Resolve alert mutation
  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertsService.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (data: RuleFormData) => alertsService.createRule(transformRuleToBackend(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setCreateRuleOpen(false);
      setRuleForm(defaultRuleForm);
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RuleFormData }) =>
      alertsService.updateRule(id, transformRuleToBackend(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setEditingRule(null);
      setRuleForm(defaultRuleForm);
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => alertsService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setDeletingRule(null);
    },
  });

  // Toggle rule mutation
  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      alertsService.toggleRule(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });

  const handleOpenCreateRule = () => {
    setRuleForm(defaultRuleForm);
    setCreateRuleOpen(true);
  };

  const handleOpenEditRule = (rule: AlertRule) => {
    setRuleForm({
      name: rule.name,
      description: rule.description,
      metric: rule.metric,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      channels: rule.channels,
      cooldown: rule.cooldown,
    });
    setEditingRule(rule);
  };

  const handleCreateRule = () => {
    if (!ruleForm.name || !ruleForm.metric) return;
    createRuleMutation.mutate(ruleForm);
  };

  const handleUpdateRule = () => {
    if (!editingRule || !ruleForm.name || !ruleForm.metric) return;
    updateRuleMutation.mutate({ id: editingRule.id, data: ruleForm });
  };

  const handleDeleteRule = () => {
    if (!deletingRule) return;
    deleteRuleMutation.mutate(deletingRule.id);
  };

  const handleToggleChannel = (channel: 'email' | 'slack' | 'webhook') => {
    const channels = ruleForm.channels.includes(channel)
      ? ruleForm.channels.filter(c => c !== channel)
      : [...ruleForm.channels, channel];
    setRuleForm({ ...ruleForm, channels });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const activeCount = alerts?.filter((a: Alert) => a.status === 'active').length || 0;

  const RuleFormContent = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>规则名称 *</Label>
        <Input
          placeholder="例如: API 响应时间告警"
          value={ruleForm.name}
          onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>描述</Label>
        <Textarea
          placeholder="规则描述"
          rows={2}
          value={ruleForm.description}
          onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>指标 *</Label>
          <Select
            value={ruleForm.metric}
            onValueChange={(value) => setRuleForm({ ...ruleForm, metric: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择指标" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>条件</Label>
          <Select
            value={ruleForm.condition}
            onValueChange={(value: any) => setRuleForm({ ...ruleForm, condition: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="条件" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gt">大于</SelectItem>
              <SelectItem value="lt">小于</SelectItem>
              <SelectItem value="gte">大于等于</SelectItem>
              <SelectItem value="lte">小于等于</SelectItem>
              <SelectItem value="eq">等于</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>阈值</Label>
          <Input
            type="number"
            placeholder="阈值"
            value={ruleForm.threshold}
            onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>严重程度</Label>
          <Select
            value={ruleForm.severity}
            onValueChange={(value: any) => setRuleForm({ ...ruleForm, severity: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择严重程度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">信息</SelectItem>
              <SelectItem value="warning">警告</SelectItem>
              <SelectItem value="critical">严重</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>冷却时间（秒）</Label>
          <Input
            type="number"
            placeholder="300"
            value={ruleForm.cooldown}
            onChange={(e) => setRuleForm({ ...ruleForm, cooldown: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>通知渠道</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={ruleForm.channels.includes('email')}
              onCheckedChange={() => handleToggleChannel('email')}
            />
            <span className="text-sm">邮件</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={ruleForm.channels.includes('slack')}
              onCheckedChange={() => handleToggleChannel('slack')}
            />
            <span className="text-sm">Slack</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={ruleForm.channels.includes('webhook')}
              onCheckedChange={() => handleToggleChannel('webhook')}
            />
            <span className="text-sm">Webhook</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <Bell className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃告警</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日告警</p>
              <p className="text-2xl font-bold">{alerts?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已解决</p>
              <p className="text-2xl font-bold">
                {alerts?.filter((a: Alert) => a.status === 'resolved').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">告警规则</p>
              <p className="text-2xl font-bold">{rules?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            告警列表
            {activeCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {activeCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            告警规则
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="acknowledged">已确认</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alerts List */}
          <div className="space-y-3">
            {alertsLoading ? (
              <div className="rounded-lg bg-white p-12 text-center text-gray-500 shadow">
                加载中...
              </div>
            ) : alerts?.length ? (
              alerts.map((alert: Alert) => {
                const TypeIcon = typeConfig[alert.type]?.icon || Info;
                const SourceIcon = sourceConfig[alert.source]?.icon || Server;

                return (
                  <div
                    key={alert.id}
                    className="rounded-lg bg-white p-4 shadow hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`rounded-full p-2 ${typeConfig[alert.type]?.color || 'bg-gray-100 text-gray-500'}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge className={statusConfig[alert.status]?.color}>
                              {statusConfig[alert.status]?.label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">{alert.message}</p>
                          {alert.metric && (
                            <div className="mt-2 flex items-center gap-4 text-sm">
                              <span className="text-gray-500">{alert.metric.name}:</span>
                              <span className="font-medium text-red-500">
                                {alert.metric.value} {alert.metric.unit}
                              </span>
                              <span className="text-gray-400">
                                (阈值: {alert.metric.threshold} {alert.metric.unit})
                              </span>
                            </div>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <SourceIcon className="h-3 w-3" />
                              {sourceConfig[alert.source]?.label}
                            </span>
                            <span>{formatDate(alert.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={acknowledgeMutation.isPending}
                              onClick={() => acknowledgeMutation.mutate(alert.id)}
                            >
                              确认
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resolveMutation.isPending}
                              onClick={() => resolveMutation.mutate(alert.id)}
                            >
                              解决
                            </Button>
                          </>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resolveMutation.isPending}
                            onClick={() => resolveMutation.mutate(alert.id)}
                          >
                            解决
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg bg-white p-12 text-center text-gray-500 shadow">
                <BellOff className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4">暂无告警</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleOpenCreateRule}>
              <Plus className="mr-2 h-4 w-4" />
              创建规则
            </Button>
          </div>

          <div className="rounded-lg bg-white shadow">
            {rulesLoading ? (
              <div className="p-12 text-center text-gray-500">加载中...</div>
            ) : rules?.length ? (
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">规则名称</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">条件</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">严重程度</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">通知渠道</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(rules || []).map((rule: AlertRule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-gray-500">{rule.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <code className="rounded bg-gray-100 px-2 py-1">
                          {rule.metric} {conditionLabels[rule.condition] || rule.condition} {rule.threshold}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            rule.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : rule.severity === 'warning'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {rule.severity === 'critical' ? '严重' : rule.severity === 'warning' ? '警告' : '信息'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {(rule.channels || []).map((c: string) => (
                            <Badge key={c} variant="outline" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Switch
                          checked={rule.enabled}
                          disabled={toggleRuleMutation.isPending}
                          onCheckedChange={(checked) =>
                            toggleRuleMutation.mutate({ id: rule.id, enabled: checked })
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingRule(rule)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Settings className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4">暂无告警规则</p>
                <Button className="mt-4" onClick={handleOpenCreateRule}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建第一个规则
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>告警详情</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={typeConfig[selectedAlert.type]?.color}>
                  {typeConfig[selectedAlert.type]?.label}
                </Badge>
                <Badge className={statusConfig[selectedAlert.status]?.color}>
                  {statusConfig[selectedAlert.status]?.label}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium">{selectedAlert.title}</h4>
                <p className="text-sm text-gray-500">{selectedAlert.message}</p>
              </div>
              {selectedAlert.metric && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500">指标详情</p>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">当前值</span>
                      <p className="font-medium">
                        {selectedAlert.metric.value} {selectedAlert.metric.unit}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">阈值</span>
                      <p className="font-medium">
                        {selectedAlert.metric.threshold} {selectedAlert.metric.unit}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">来源</span>
                  <p className="font-medium">{sourceConfig[selectedAlert.source]?.label}</p>
                </div>
                <div>
                  <span className="text-gray-500">创建时间</span>
                  <p className="font-medium">{formatDate(selectedAlert.createdAt)}</p>
                </div>
                {selectedAlert.acknowledgedAt && (
                  <div>
                    <span className="text-gray-500">确认时间</span>
                    <p className="font-medium">{formatDate(selectedAlert.acknowledgedAt)}</p>
                  </div>
                )}
                {selectedAlert.resolvedAt && (
                  <div>
                    <span className="text-gray-500">解决时间</span>
                    <p className="font-medium">{formatDate(selectedAlert.resolvedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedAlert?.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  disabled={acknowledgeMutation.isPending}
                  onClick={() => {
                    acknowledgeMutation.mutate(selectedAlert.id);
                    setSelectedAlert(null);
                  }}
                >
                  确认告警
                </Button>
                <Button
                  disabled={resolveMutation.isPending}
                  onClick={() => {
                    resolveMutation.mutate(selectedAlert.id);
                    setSelectedAlert(null);
                  }}
                >
                  解决告警
                </Button>
              </>
            )}
            {selectedAlert?.status === 'acknowledged' && (
              <Button
                disabled={resolveMutation.isPending}
                onClick={() => {
                  resolveMutation.mutate(selectedAlert.id);
                  setSelectedAlert(null);
                }}
              >
                解决告警
              </Button>
            )}
            {selectedAlert?.status === 'resolved' && (
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog */}
      <Dialog open={createRuleOpen} onOpenChange={setCreateRuleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建告警规则</DialogTitle>
            <DialogDescription>设置告警触发条件和通知方式</DialogDescription>
          </DialogHeader>
          <RuleFormContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRuleOpen(false)}>
              取消
            </Button>
            <Button
              disabled={!ruleForm.name || !ruleForm.metric || createRuleMutation.isPending}
              onClick={handleCreateRule}
            >
              {createRuleMutation.isPending ? '创建中...' : '创建规则'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑告警规则</DialogTitle>
            <DialogDescription>修改告警触发条件和通知方式</DialogDescription>
          </DialogHeader>
          <RuleFormContent isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>
              取消
            </Button>
            <Button
              disabled={!ruleForm.name || !ruleForm.metric || updateRuleMutation.isPending}
              onClick={handleUpdateRule}
            >
              {updateRuleMutation.isPending ? '保存中...' : '保存更改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation Dialog */}
      <Dialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除告警规则</DialogTitle>
            <DialogDescription>
              确定要删除规则 "{deletingRule?.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRule(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleteRuleMutation.isPending}
              onClick={handleDeleteRule}
            >
              {deleteRuleMutation.isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
