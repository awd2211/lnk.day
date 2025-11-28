import { TrendingUp, TrendingDown, Minus, Trophy, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ABTestStats } from '@/hooks/useABTests';

interface StatisticsCardProps {
  stats: ABTestStats;
}

export function StatisticsCard({ stats }: StatisticsCardProps) {
  const { significance, recommendation, variants } = stats;

  return (
    <div className="space-y-6">
      {/* Significance Status */}
      <div className="rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold dark:text-white">统计显著性</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">置信度</p>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={significance.confidence} className="flex-1" />
              <span className="font-semibold dark:text-white">
                {significance.confidence.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {significance.isSignificant ? '已达到统计显著性 (≥95%)' : '尚未达到统计显著性'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">样本量</p>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold dark:text-white">
                  {significance.currentSampleSize.toLocaleString()}
                </span>
                <span className="text-gray-500">
                  / {significance.sampleSizeRequired.toLocaleString()}
                </span>
              </div>
              <Progress
                value={(significance.currentSampleSize / significance.sampleSizeRequired) * 100}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {recommendation && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-lg p-4 ${
              recommendation.action === 'winner_found'
                ? 'bg-green-50 dark:bg-green-900/20'
                : recommendation.action === 'continue'
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'bg-gray-50 dark:bg-gray-700'
            }`}
          >
            {recommendation.action === 'winner_found' ? (
              <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : recommendation.action === 'continue' ? (
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Minus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
            <div>
              <p
                className={`font-medium ${
                  recommendation.action === 'winner_found'
                    ? 'text-green-800 dark:text-green-300'
                    : recommendation.action === 'continue'
                      ? 'text-blue-800 dark:text-blue-300'
                      : 'text-gray-800 dark:text-gray-300'
                }`}
              >
                {recommendation.action === 'winner_found'
                  ? '发现优胜者!'
                  : recommendation.action === 'continue'
                    ? '继续测试'
                    : '无显著差异'}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {recommendation.message}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Variant Comparison */}
      <div className="rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold dark:text-white">变体对比</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  变体
                </th>
                <th className="py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  点击
                </th>
                <th className="py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  转化
                </th>
                <th className="py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  转化率
                </th>
                <th className="py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  对比基准
                </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id} className="border-b dark:border-gray-700">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium dark:text-white">{variant.name}</span>
                      {variant.isControl && (
                        <Badge variant="outline" className="text-xs">
                          基准
                        </Badge>
                      )}
                      {recommendation?.winnerId === variant.id && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          <Trophy className="mr-1 h-3 w-3" />
                          优胜
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-right dark:text-white">
                    {variant.clicks.toLocaleString()}
                  </td>
                  <td className="py-4 text-right dark:text-white">
                    {variant.conversions.toLocaleString()}
                  </td>
                  <td className="py-4 text-right dark:text-white">
                    {variant.conversionRate.toFixed(2)}%
                  </td>
                  <td className="py-4 text-right">
                    {variant.isControl ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span
                        className={`flex items-center justify-end gap-1 ${
                          variant.improvement > 0
                            ? 'text-green-600 dark:text-green-400'
                            : variant.improvement < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500'
                        }`}
                      >
                        {variant.improvement > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : variant.improvement < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                        {variant.improvement > 0 ? '+' : ''}
                        {variant.improvement.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">总点击</p>
          <p className="mt-1 text-2xl font-bold dark:text-white">
            {stats.totalClicks.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">总转化</p>
          <p className="mt-1 text-2xl font-bold dark:text-white">
            {stats.totalConversions.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">整体转化率</p>
          <p className="mt-1 text-2xl font-bold dark:text-white">
            {stats.overallConversionRate.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
