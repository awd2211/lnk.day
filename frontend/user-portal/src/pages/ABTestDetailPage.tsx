import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  Loader2,
  Link2,
  Clock,
  Trophy,
  ExternalLink,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useABTest,
  useABTestStats,
  useDeleteABTest,
  useStartABTest,
  usePauseABTest,
  useCompleteABTest,
  type ABTest,
} from '@/hooks/useABTests';
import { StatisticsCard } from '@/components/abtest/StatisticsCard';

const statusConfig: Record<
  ABTest['status'],
  { label: string; color: string }
> = {
  draft: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  running: {
    label: '运行中',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  paused: {
    label: '已暂停',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  completed: {
    label: '已完成',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
};

export default function ABTestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Queries
  const { data: test, isLoading: testLoading } = useABTest(id!);
  const { data: stats, isLoading: statsLoading } = useABTestStats(id!);

  // Mutations
  const deleteTest = useDeleteABTest();
  const startTest = useStartABTest();
  const pauseTest = usePauseABTest();
  const completeTest = useCompleteABTest();

  const handleStart = async () => {
    try {
      await startTest.mutateAsync(id!);
      toast({ title: '测试已启动' });
    } catch (error: any) {
      toast({
        title: '启动失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handlePause = async () => {
    try {
      await pauseTest.mutateAsync(id!);
      toast({ title: '测试已暂停' });
    } catch (error: any) {
      toast({
        title: '暂停失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = async (winnerId?: string) => {
    if (!winnerId && !confirm('确定要在没有选择优胜者的情况下结束测试吗？')) {
      return;
    }

    try {
      await completeTest.mutateAsync({ id: id!, winnerId });
      toast({ title: '测试已结束' });
    } catch (error: any) {
      toast({
        title: '结束失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此测试吗？此操作无法撤销。')) {
      return;
    }

    try {
      await deleteTest.mutateAsync(id!);
      toast({ title: '测试已删除' });
      navigate('/ab-tests');
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  if (testLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </Layout>
    );
  }

  if (!test) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-lg font-semibold dark:text-white">测试不存在</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">请检查链接是否正确</p>
          <Button className="mt-4" onClick={() => navigate('/ab-tests')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
        </div>
      </Layout>
    );
  }

  const status = statusConfig[test.status];

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate('/ab-tests')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold dark:text-white">{test.name}</h1>
              <Badge className={status.color}>{status.label}</Badge>
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
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                创建于 {new Date(test.createdAt).toLocaleDateString('zh-CN')}
              </span>
              {test.startedAt && (
                <span>开始于 {new Date(test.startedAt).toLocaleDateString('zh-CN')}</span>
              )}
              {test.completedAt && (
                <span>结束于 {new Date(test.completedAt).toLocaleDateString('zh-CN')}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {test.status === 'draft' && (
              <Button onClick={handleStart} disabled={startTest.isPending}>
                {startTest.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                启动测试
              </Button>
            )}
            {test.status === 'running' && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePause}
                  disabled={pauseTest.isPending}
                >
                  {pauseTest.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="mr-2 h-4 w-4" />
                  )}
                  暂停
                </Button>
                <Button onClick={() => handleComplete()} disabled={completeTest.isPending}>
                  {completeTest.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  结束测试
                </Button>
              </>
            )}
            {test.status === 'paused' && (
              <>
                <Button onClick={handleStart} disabled={startTest.isPending}>
                  {startTest.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  继续测试
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleComplete()}
                  disabled={completeTest.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  结束测试
                </Button>
              </>
            )}
            {test.status !== 'running' && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteTest.isPending}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="mb-8 rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold dark:text-white">变体配置</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {test.variants.map((variant, index) => (
            <div
              key={variant.id}
              className={`rounded-lg border p-4 ${
                test.winnerId === variant.id
                  ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                  : 'dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium dark:text-white">{variant.name}</span>
                  {index === 0 && (
                    <Badge variant="outline" className="text-xs">
                      对照组
                    </Badge>
                  )}
                  {test.winnerId === variant.id && (
                    <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <Badge variant="secondary">{variant.weight}%</Badge>
              </div>
              <a
                href={variant.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                <ExternalLink className="h-3 w-3" />
                {variant.url}
              </a>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold dark:text-white">
                    {variant.clicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">点击</p>
                </div>
                <div>
                  <p className="text-lg font-bold dark:text-white">
                    {variant.conversions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">转化</p>
                </div>
                <div>
                  <p className="text-lg font-bold dark:text-white">
                    {variant.conversionRate.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">转化率</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : stats ? (
        <StatisticsCard stats={stats} />
      ) : (
        <div className="rounded-lg border bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-gray-500 dark:text-gray-400">
            {test.status === 'draft'
              ? '启动测试后将显示统计数据'
              : '暂无统计数据'}
          </p>
        </div>
      )}
    </Layout>
  );
}
