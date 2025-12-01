import { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Power,
  Edit,
  Copy,
  BarChart3,
  Settings2,
  Globe,
  Smartphone,
  Monitor,
  Clock,
  Calendar,
  ExternalLink,
  Search,
  Cookie,
  Network,
  Shuffle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import {
  useRedirectRules,
  useRedirectRuleStats,
  useCreateRedirectRule,
  useUpdateRedirectRule,
  useDeleteRedirectRule,
  useToggleRedirectRule,
  RedirectRule,
  RuleCondition,
  RuleConditionType,
  RuleOperator,
  CreateRedirectRuleData,
  CONDITION_TYPE_LABELS,
  OPERATOR_LABELS,
  DEVICE_VALUES,
  BROWSER_VALUES,
  OS_VALUES,
  COUNTRY_CODES,
} from '@/hooks/useRedirectRules';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface RedirectRulesManagerProps {
  linkId: string;
  className?: string;
}

const ConditionIcon = ({ type }: { type: RuleConditionType }) => {
  const iconClass = 'h-4 w-4';
  switch (type) {
    case 'country':
      return <Globe className={iconClass} />;
    case 'device':
      return <Smartphone className={iconClass} />;
    case 'browser':
    case 'os':
      return <Monitor className={iconClass} />;
    case 'time':
      return <Clock className={iconClass} />;
    case 'date':
      return <Calendar className={iconClass} />;
    case 'referrer':
      return <ExternalLink className={iconClass} />;
    case 'query_param':
      return <Search className={iconClass} />;
    case 'cookie':
      return <Cookie className={iconClass} />;
    case 'ip_range':
      return <Network className={iconClass} />;
    case 'random':
      return <Shuffle className={iconClass} />;
    default:
      return <Settings2 className={iconClass} />;
  }
};

const getOperatorsForType = (type: RuleConditionType): RuleOperator[] => {
  switch (type) {
    case 'country':
    case 'device':
    case 'browser':
    case 'os':
    case 'language':
      return ['equals', 'not_equals', 'in', 'not_in'];
    case 'referrer':
    case 'query_param':
    case 'cookie':
      return ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'];
    case 'time':
    case 'date':
      return ['between', 'greater_than', 'less_than'];
    case 'ip_range':
      return ['in', 'not_in'];
    case 'random':
      return ['less_than'];
    default:
      return ['equals', 'not_equals'];
  }
};

export function RedirectRulesManager({ linkId, className }: RedirectRulesManagerProps) {
  const { toast } = useToast();

  // Queries
  const { data: rules, isLoading } = useRedirectRules(linkId);
  const { data: stats } = useRedirectRuleStats(linkId);

  // Mutations
  const createRule = useCreateRedirectRule();
  const updateRule = useUpdateRedirectRule();
  const deleteRule = useDeleteRedirectRule();
  const toggleRule = useToggleRedirectRule();

  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RedirectRule | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateRedirectRuleData>({
    name: '',
    description: '',
    conditions: [{ type: 'country', operator: 'equals', value: '' }],
    conditionLogic: 'and',
    targetUrl: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      conditions: [{ type: 'country', operator: 'equals', value: '' }],
      conditionLogic: 'and',
      targetUrl: '',
    });
    setEditingRule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: RedirectRule) => {
    setFormData({
      name: rule.name,
      description: rule.description || '',
      conditions: rule.conditions,
      conditionLogic: rule.conditionLogic,
      targetUrl: rule.targetUrl,
    });
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.targetUrl.trim()) return;

    try {
      if (editingRule) {
        await updateRule.mutateAsync({
          linkId,
          id: editingRule.id,
          data: formData,
        });
        toast({ title: '规则已更新' });
      } else {
        await createRule.mutateAsync({
          linkId,
          data: formData,
        });
        toast({ title: '规则已创建' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: editingRule ? '更新失败' : '创建失败', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingRuleId) return;

    try {
      await deleteRule.mutateAsync({ id: deletingRuleId, linkId });
      setDeletingRuleId(null);
      toast({ title: '规则已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleToggle = async (rule: RedirectRule) => {
    try {
      await toggleRule.mutateAsync({ id: rule.id, linkId });
      toast({
        title: rule.isActive ? '规则已禁用' : '规则已启用',
      });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const toggleExpanded = (ruleId: string) => {
    const newSet = new Set(expandedRules);
    if (newSet.has(ruleId)) {
      newSet.delete(ruleId);
    } else {
      newSet.add(ruleId);
    }
    setExpandedRules(newSet);
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { type: 'country', operator: 'equals', value: '' },
      ],
    });
  };

  const removeCondition = (index: number) => {
    if (formData.conditions.length <= 1) return;
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...formData.conditions];
    const currentCondition = newConditions[index];
    if (!currentCondition) return;

    const updatedCondition: RuleCondition = {
      type: updates.type ?? currentCondition.type,
      operator: updates.operator ?? currentCondition.operator,
      value: updates.value ?? currentCondition.value,
      ...(updates.key !== undefined || currentCondition.key !== undefined
        ? { key: updates.key ?? currentCondition.key }
        : {}),
    };

    // Reset operator if type changed
    if (updates.type) {
      const validOperators = getOperatorsForType(updates.type);
      if (!validOperators.includes(updatedCondition.operator)) {
        const firstOperator = validOperators[0];
        if (firstOperator) {
          updatedCondition.operator = firstOperator;
        }
      }
      updatedCondition.value = '';
    }

    newConditions[index] = updatedCondition;
    setFormData({ ...formData, conditions: newConditions });
  };

  const renderConditionValueInput = (condition: RuleCondition, index: number) => {
    const { type, operator } = condition;

    // Select for predefined values
    if (['device', 'browser', 'os'].includes(type)) {
      const values = type === 'device' ? DEVICE_VALUES : type === 'browser' ? BROWSER_VALUES : OS_VALUES;
      return (
        <Select
          value={condition.value as string}
          onValueChange={(v) => updateCondition(index, { value: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择值" />
          </SelectTrigger>
          <SelectContent>
            {values.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Country select
    if (type === 'country') {
      return (
        <Select
          value={condition.value as string}
          onValueChange={(v) => updateCondition(index, { value: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择国家" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Random percentage
    if (type === 'random') {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            max="100"
            value={condition.value as number}
            onChange={(e) => updateCondition(index, { value: parseInt(e.target.value) || 0 })}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">% 的访问者</span>
        </div>
      );
    }

    // Time range
    if (type === 'time' && operator === 'between') {
      const value = condition.value as { start: string; end: string } || { start: '', end: '' };
      return (
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={value.start}
            onChange={(e) => updateCondition(index, { value: { ...value, start: e.target.value } })}
          />
          <span>到</span>
          <Input
            type="time"
            value={value.end}
            onChange={(e) => updateCondition(index, { value: { ...value, end: e.target.value } })}
          />
        </div>
      );
    }

    // Date range
    if (type === 'date' && operator === 'between') {
      const value = condition.value as { start: string; end: string } || { start: '', end: '' };
      return (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={value.start}
            onChange={(e) => updateCondition(index, { value: { ...value, start: e.target.value } })}
          />
          <span>到</span>
          <Input
            type="date"
            value={value.end}
            onChange={(e) => updateCondition(index, { value: { ...value, end: e.target.value } })}
          />
        </div>
      );
    }

    // Query param or cookie - needs key
    if (['query_param', 'cookie'].includes(type)) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder={type === 'query_param' ? '参数名' : 'Cookie 名'}
            value={condition.key || ''}
            onChange={(e) => updateCondition(index, { key: e.target.value })}
          />
          <Input
            placeholder="值"
            value={condition.value as string}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
          />
        </div>
      );
    }

    // Default text input
    return (
      <Input
        placeholder="输入值"
        value={condition.value as string}
        onChange={(e) => updateCondition(index, { value: e.target.value })}
      />
    );
  };

  const formatConditionDisplay = (condition: RuleCondition) => {
    const typeLabel = CONDITION_TYPE_LABELS[condition.type].label;
    const operatorLabel = OPERATOR_LABELS[condition.operator];

    let valueDisplay = '';
    if (typeof condition.value === 'object' && 'start' in condition.value) {
      valueDisplay = `${condition.value.start} - ${condition.value.end}`;
    } else if (Array.isArray(condition.value)) {
      valueDisplay = condition.value.join(', ');
    } else {
      valueDisplay = String(condition.value);
    }

    if (condition.key) {
      return `${typeLabel} "${condition.key}" ${operatorLabel} "${valueDisplay}"`;
    }

    if (condition.type === 'random') {
      return `随机 ${valueDisplay}% 的访问者`;
    }

    return `${typeLabel} ${operatorLabel} "${valueDisplay}"`;
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">重定向规则</h3>
          <p className="text-sm text-muted-foreground">
            根据条件将访问者重定向到不同的目标
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          添加规则
        </Button>
      </div>

      {/* Stats */}
      {stats && stats.totalRules > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="flex items-center gap-6 py-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalRules}</p>
              <p className="text-xs text-muted-foreground">总规则数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.activeRules}</p>
              <p className="text-xs text-muted-foreground">活跃规则</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalMatches.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">总匹配次数</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {rules && rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <Collapsible
              key={rule.id}
              open={expandedRules.has(rule.id)}
              onOpenChange={() => toggleExpanded(rule.id)}
            >
              <Card className={cn(!rule.isActive && 'opacity-60')}>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.name}</span>
                        {!rule.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            已禁用
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {expandedRules.has(rule.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggle(rule)}
                      >
                        <Power
                          className={cn(
                            'h-4 w-4',
                            rule.isActive ? 'text-green-600' : 'text-muted-foreground'
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingRuleId(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="border-t pt-4">
                    <div className="space-y-3">
                      {/* Conditions */}
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          条件 ({rule.conditionLogic === 'and' ? '全部满足' : '满足任一'})
                        </p>
                        <div className="space-y-1">
                          {rule.conditions.map((condition, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <ConditionIcon type={condition.type} />
                              <span className="text-sm">{formatConditionDisplay(condition)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Target */}
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">目标链接</p>
                        <a
                          href={rule.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {rule.targetUrl}
                        </a>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          匹配 {rule.matchCount.toLocaleString()} 次
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Settings2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无重定向规则</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              添加第一条规则
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && setIsDialogOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? '编辑规则' : '添加规则'}</DialogTitle>
            <DialogDescription>
              设置条件和目标 URL，满足条件的访问者将被重定向
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <Label htmlFor="rule-name">规则名称 *</Label>
              <Input
                id="rule-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 移动端用户"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="rule-desc">描述</Label>
              <Textarea
                id="rule-desc"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="规则说明..."
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>条件</Label>
                <Select
                  value={formData.conditionLogic}
                  onValueChange={(v: 'and' | 'or') =>
                    setFormData({ ...formData, conditionLogic: v })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">全部满足</SelectItem>
                    <SelectItem value="or">满足任一</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.conditions.map((condition, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      条件 {index + 1}
                    </Badge>
                    {formData.conditions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Type */}
                    <div>
                      <Label className="text-xs">条件类型</Label>
                      <Select
                        value={condition.type}
                        onValueChange={(v: RuleConditionType) =>
                          updateCondition(index, { type: v })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CONDITION_TYPE_LABELS).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator */}
                    <div>
                      <Label className="text-xs">操作符</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(v: RuleOperator) =>
                          updateCondition(index, { operator: v })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getOperatorsForType(condition.type).map((op) => (
                            <SelectItem key={op} value={op}>
                              {OPERATOR_LABELS[op]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value */}
                    <div>
                      <Label className="text-xs">值</Label>
                      <div className="mt-1">
                        {renderConditionValueInput(condition, index)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="mr-2 h-4 w-4" />
                添加条件
              </Button>
            </div>

            {/* Target URL */}
            <div>
              <Label htmlFor="target-url">目标链接 *</Label>
              <Input
                id="target-url"
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                placeholder="https://example.com/mobile"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                满足条件的访问者将被重定向到此链接
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name.trim() ||
                !formData.targetUrl.trim() ||
                createRule.isPending ||
                updateRule.isPending
              }
            >
              {createRule.isPending || updateRule.isPending
                ? '保存中...'
                : editingRule
                ? '保存'
                : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingRuleId}
        onOpenChange={(open) => !open && setDeletingRuleId(null)}
        title="删除规则"
        description="确定要删除此重定向规则吗？此操作无法撤销。"
        confirmText="删除"
        onConfirm={handleDelete}
        isLoading={deleteRule.isPending}
        variant="destructive"
      />
    </div>
  );
}
