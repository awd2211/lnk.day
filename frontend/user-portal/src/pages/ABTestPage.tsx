import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TestTube2,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  Eye,
  Loader2,
  Link2,
  Clock,
  Trophy,
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
import {
  useABTests,
  useCreateABTest,
  useDeleteABTest,
  useStartABTest,
  usePauseABTest,
  useCompleteABTest,
  type ABTest,
} from '@/hooks/useABTests';
import { useLinks } from '@/hooks/useLinks';
import { VariantEditor } from '@/components/abtest/VariantEditor';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const statusConfig: Record<
  ABTest['status'],
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    icon: <Clock className="h-3 w-3" />,
  },
  running: {
    label: '运行中',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: <Play className="h-3 w-3" />,
  },
  paused: {
    label: '已暂停',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: <Pause className="h-3 w-3" />,
  },
  completed: {
    label: '已完成',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: <CheckCircle className="h-3 w-3" />,
  },
};

export default function ABTestPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  const [completingTestId, setCompletingTestId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [variants, setVariants] = useState<Array<{ name: string; url: string; weight: number }>>([
    { name: '对照组 (A)', url: '', weight: 50 },
    { name: '变体 (B)', url: '', weight: 50 },
  ]);

  // Queries
  const { data: testsData, isLoading } = useABTests({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const { data: linksData } = useLinks({ limit: 100 });

  // Mutations
  const createTest = useCreateABTest();
  const deleteTest = useDeleteABTest();
  const startTest = useStartABTest();
  const pauseTest = usePauseABTest();
  const completeTest = useCompleteABTest();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: '请输入测试名称', variant: 'destructive' });
      return;
    }

    if (!selectedLinkId) {
      toast({ title: '请选择关联链接', variant: 'destructive' });
      return;
    }

    const invalidVariant = variants.find((v) => !v.url.trim());
    if (invalidVariant) {
      toast({ title: '请填写所有变体的目标 URL', variant: 'destructive' });
      return;
    }

    try {
      await createTest.mutateAsync({
        name: name.trim(),
        linkId: selectedLinkId,
        variants,
      });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: 'A/B 测试已创建' });
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingTestId) return;

    try {
      await deleteTest.mutateAsync(deletingTestId);
      setDeletingTestId(null);
      toast({ title: '测试已删除' });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleStart = async (id: string) => {
    try {
      await startTest.mutateAsync(id);
      toast({ title: '测试已启动' });
    } catch (error: any) {
      toast({
        title: '启动失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseTest.mutateAsync(id);
      toast({ title: '测试已暂停' });
    } catch (error: any) {
      toast({
        title: '暂停失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = async () => {
    if (!completingTestId) return;

    try {
      await completeTest.mutateAsync({ id: completingTestId });
      setCompletingTestId(null);
      toast({ title: '测试已结束' });
    } catch (error: any) {
      toast({
        title: '结束失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedLinkId('');
    setVariants([
      { name: '对照组 (A)', url: '', weight: 50 },
      { name: '变体 (B)', url: '', weight: 50 },
    ]);
  };

  const tests = testsData?.items || [];
  const links = linksData?.items || [];

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">A/B 测试</h1>
          <p className="text-gray-500 dark:text-gray-400">
            创建和管理 A/B 测试，优化链接转化率
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建测试
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="running">运行中</SelectItem>
            <SelectItem value="paused">已暂停</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tests List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
          <TestTube2 className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            暂无 A/B 测试
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            创建 A/B 测试来优化您的链接转化率
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建第一个测试
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const status = statusConfig[test.status];
            return (
              <div
                key={test.id}
                className="rounded-lg border bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold dark:text-white">{test.name}</h3>
                      <Badge className={status.color}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                      {test.winnerId && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          <Trophy className="mr-1 h-3 w-3" />
                          优胜者: {test.winnerName}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Link2 className="h-4 w-4" />/{test.linkShortCode}
                      </span>
                      <span>{test.variants.length} 个变体</span>
                      <span>{test.totalClicks.toLocaleString()} 次点击</span>
                      {test.startedAt && (
                        <span>
                          开始于 {new Date(test.startedAt).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>

                    {/* Variant preview */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {test.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="rounded bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-700"
                        >
                          <span className="font-medium dark:text-white">{variant.name}</span>
                          <span className="ml-2 text-gray-500 dark:text-gray-400">
                            {variant.weight}% · {variant.clicks} 点击 ·{' '}
                            {variant.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/ab-tests/${test.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        查看详情
                      </DropdownMenuItem>
                      {test.status === 'draft' && (
                        <DropdownMenuItem onClick={() => handleStart(test.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          启动测试
                        </DropdownMenuItem>
                      )}
                      {test.status === 'running' && (
                        <>
                          <DropdownMenuItem onClick={() => handlePause(test.id)}>
                            <Pause className="mr-2 h-4 w-4" />
                            暂停测试
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCompletingTestId(test.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            结束测试
                          </DropdownMenuItem>
                        </>
                      )}
                      {test.status === 'paused' && (
                        <>
                          <DropdownMenuItem onClick={() => handleStart(test.id)}>
                            <Play className="mr-2 h-4 w-4" />
                            继续测试
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCompletingTestId(test.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            结束测试
                          </DropdownMenuItem>
                        </>
                      )}
                      {test.status !== 'running' && (
                        <DropdownMenuItem
                          onClick={() => setDeletingTestId(test.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建 A/B 测试</DialogTitle>
            <DialogDescription>
              为您的链接创建 A/B 测试，比较不同版本的表现
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="test-name">测试名称</Label>
              <Input
                id="test-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：首页 CTA 按钮测试"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="link-select">关联链接</Label>
              <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择一个链接" />
                </SelectTrigger>
                <SelectContent>
                  {links.map((link) => (
                    <SelectItem key={link.id} value={link.id}>
                      /{link.shortCode} - {link.title || link.originalUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                选择要进行 A/B 测试的短链接
              </p>
            </div>

            <VariantEditor variants={variants} onChange={setVariants} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createTest.isPending}>
              {createTest.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建测试'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Test Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingTestId}
        onOpenChange={(open) => !open && setDeletingTestId(null)}
        title="删除测试"
        description="确定要删除此测试吗？此操作无法撤销。"
        confirmText="删除"
        onConfirm={handleDelete}
        isLoading={deleteTest.isPending}
        variant="destructive"
      />

      {/* Complete Test Confirm Dialog */}
      <ConfirmDialog
        open={!!completingTestId}
        onOpenChange={(open) => !open && setCompletingTestId(null)}
        title="结束测试"
        description="确定要结束此测试吗？"
        confirmText="确定结束"
        onConfirm={handleComplete}
        isLoading={completeTest.isPending}
      />
    </Layout>
  );
}
