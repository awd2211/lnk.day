import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Power,
  PowerOff,
  GripVertical,
  Loader2,
  Link2,
  Globe,
  Smartphone,
  Clock,
  Search,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLinks } from '@/hooks/useLinks';
import {
  useRedirectRules,
  useCreateRedirectRule,
  useDeleteRedirectRule,
  useToggleRedirectRule,
  type RedirectRule,
  type RuleCondition,
  CONDITION_TYPE_LABELS,
} from '@/hooks/useRedirectRules';
import { RuleConditionEditor } from '@/components/redirect-rules/RuleConditionEditor';

const conditionIcons: Record<string, React.ReactNode> = {
  country: <Globe className="h-4 w-4" />,
  device: <Smartphone className="h-4 w-4" />,
  time: <Clock className="h-4 w-4" />,
  query_param: <Search className="h-4 w-4" />,
};

export default function RedirectRulesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [conditionLogic, setConditionLogic] = useState<'and' | 'or'>('and');

  // Queries
  const { data: linksData, isLoading: linksLoading } = useLinks({ limit: 100 });
  const { data: rules, isLoading: rulesLoading } = useRedirectRules(selectedLinkId || null);

  // Mutations
  const createRule = useCreateRedirectRule();
  const deleteRule = useDeleteRedirectRule();
  const toggleRule = useToggleRedirectRule();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: '请输入规则名称', variant: 'destructive' });
      return;
    }

    if (!targetUrl.trim()) {
      toast({ title: '请输入目标 URL', variant: 'destructive' });
      return;
    }

    if (conditions.length === 0) {
      toast({ title: '请至少添加一个条件', variant: 'destructive' });
      return;
    }

    try {
      await createRule.mutateAsync({
        linkId: selectedLinkId,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          targetUrl: targetUrl.trim(),
          conditions,
          conditionLogic,
        },
      });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: '规则已创建' });
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (rule: RedirectRule) => {
    if (!confirm(`确定要删除规则"${rule.name}"吗？`)) {
      return;
    }

    try {
      await deleteRule.mutateAsync({ id: rule.id, linkId: selectedLinkId });
      toast({ title: '规则已删除' });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async (rule: RedirectRule) => {
    try {
      await toggleRule.mutateAsync({ id: rule.id, linkId: selectedLinkId });
      toast({ title: rule.isActive ? '规则已禁用' : '规则已启用' });
    } catch (error: any) {
      toast({
        title: '操作失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTargetUrl('');
    setConditions([]);
    setConditionLogic('and');
  };

  const links = linksData?.items || [];
  const selectedLink = links.find((l) => l.id === selectedLinkId);

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">重定向规则</h1>
          <p className="text-gray-500 dark:text-gray-400">
            根据访问者特征设置智能重定向
          </p>
        </div>
        {selectedLinkId && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建规则
          </Button>
        )}
      </div>

      {/* Link Selector */}
      <div className="mb-6 rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Label>选择链接</Label>
        <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
          <SelectTrigger className="mt-2 w-full md:w-96">
            <SelectValue placeholder="选择要管理规则的链接" />
          </SelectTrigger>
          <SelectContent>
            {links.map((link) => (
              <SelectItem key={link.id} value={link.id}>
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  <span>/{link.shortCode}</span>
                  {link.title && (
                    <span className="text-gray-500">- {link.title}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rules List */}
      {!selectedLinkId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
          <GitBranch className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            选择一个链接
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            选择链接后可以管理其重定向规则
          </p>
        </div>
      ) : rulesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !rules || rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
          <GitBranch className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            暂无重定向规则
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            为链接 /{selectedLink?.shortCode} 创建重定向规则
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建第一条规则
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className={`rounded-lg border bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${
                !rule.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1 cursor-grab text-gray-400">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium dark:text-white">{rule.name}</span>
                      <Badge
                        variant={rule.isActive ? 'default' : 'secondary'}
                        className={
                          rule.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : ''
                        }
                      >
                        {rule.isActive ? '启用' : '禁用'}
                      </Badge>
                    </div>

                    {rule.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {rule.description}
                      </p>
                    )}

                    {/* Conditions summary */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {rule.conditions.map((cond, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          {conditionIcons[cond.type] || null}
                          {CONDITION_TYPE_LABELS[cond.type]?.label}
                        </Badge>
                      ))}
                      {rule.conditions.length > 1 && (
                        <span className="text-xs text-gray-500">
                          ({rule.conditionLogic === 'and' ? '全部满足' : '任一满足'})
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      目标：
                      <a
                        href={rule.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {rule.targetUrl}
                      </a>
                    </div>

                    <div className="mt-2 text-xs text-gray-400">
                      匹配 {rule.matchCount.toLocaleString()} 次
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleToggle(rule)}>
                      {rule.isActive ? (
                        <>
                          <PowerOff className="mr-2 h-4 w-4" />
                          禁用
                        </>
                      ) : (
                        <>
                          <Power className="mr-2 h-4 w-4" />
                          启用
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(rule)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建重定向规则</DialogTitle>
            <DialogDescription>
              为链接 /{selectedLink?.shortCode} 创建重定向规则
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="rule-name">规则名称</Label>
              <Input
                id="rule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：移动端用户跳转"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="rule-desc">描述 (可选)</Label>
              <Input
                id="rule-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="规则用途说明"
                className="mt-1"
              />
            </div>

            <RuleConditionEditor
              conditions={conditions}
              conditionLogic={conditionLogic}
              onChange={(conds, logic) => {
                setConditions(conds);
                setConditionLogic(logic);
              }}
            />

            <div>
              <Label htmlFor="target-url">目标 URL</Label>
              <Input
                id="target-url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/mobile-page"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                满足条件时重定向到此 URL
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createRule.isPending}>
              {createRule.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建规则'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
