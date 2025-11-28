import { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  Play,
  Pause,
  Trophy,
  AlertCircle,
  Percent,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ABTestConfig as ABTestConfigType, ABTestVariant, BioLinkTheme } from '@/hooks/useBioLinks';
import { cn } from '@/lib/utils';

interface ABTestConfigProps {
  abTest: ABTestConfigType | undefined;
  currentTheme: BioLinkTheme;
  onChange: (abTest: ABTestConfigType) => void;
}

const DEFAULT_AB_TEST: ABTestConfigType = {
  isEnabled: false,
  name: '',
  variants: [
    {
      id: 'control',
      name: '原版 (对照组)',
      trafficPercentage: 50,
      isControl: true,
    },
    {
      id: `variant-${Date.now()}`,
      name: '变体 A',
      trafficPercentage: 50,
      isControl: false,
    },
  ],
  metrics: {
    clicks: true,
    conversions: false,
    timeOnPage: false,
    bounceRate: false,
  },
};

export default function ABTestConfig({ abTest, currentTheme, onChange }: ABTestConfigProps) {
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');

  const config = abTest || DEFAULT_AB_TEST;

  const updateConfig = (updates: Partial<ABTestConfigType>) => {
    onChange({ ...config, ...updates });
  };

  const updateVariant = (variantId: string, updates: Partial<ABTestVariant>) => {
    const newVariants = config.variants.map((v) =>
      v.id === variantId ? { ...v, ...updates } : v
    );
    updateConfig({ variants: newVariants });
  };

  const addVariant = () => {
    if (!newVariantName.trim()) return;

    const existingTotal = config.variants.reduce(
      (sum, v) => sum + v.trafficPercentage,
      0
    );
    const newPercentage = Math.max(0, Math.min(100 - existingTotal, 25));

    // Reduce other variants proportionally to make room
    const scaleFactor = (100 - newPercentage) / existingTotal;
    const scaledVariants = config.variants.map((v) => ({
      ...v,
      trafficPercentage: Math.round(v.trafficPercentage * scaleFactor),
    }));

    const newVariant: ABTestVariant = {
      id: `variant-${Date.now()}`,
      name: newVariantName.trim(),
      trafficPercentage: newPercentage,
      isControl: false,
    };

    updateConfig({ variants: [...scaledVariants, newVariant] });
    setNewVariantName('');
    setIsAddVariantOpen(false);
  };

  const removeVariant = (variantId: string) => {
    if (config.variants.length <= 2) return;

    const removedVariant = config.variants.find((v) => v.id === variantId);
    if (!removedVariant) return;

    const remaining = config.variants.filter((v) => v.id !== variantId);
    const removedPercentage = removedVariant.trafficPercentage;

    // Redistribute removed percentage
    const totalRemaining = remaining.reduce((sum, v) => sum + v.trafficPercentage, 0);
    const redistributed = remaining.map((v) => ({
      ...v,
      trafficPercentage: Math.round(
        v.trafficPercentage + (removedPercentage * v.trafficPercentage) / totalRemaining
      ),
    }));

    // Adjust for rounding errors
    const newTotal = redistributed.reduce((sum, v) => sum + v.trafficPercentage, 0);
    const firstVariant = redistributed[0];
    if (newTotal !== 100 && firstVariant) {
      firstVariant.trafficPercentage += 100 - newTotal;
    }

    updateConfig({ variants: redistributed });
  };

  const updateTrafficDistribution = (variantId: string, newPercentage: number) => {
    const variant = config.variants.find((v) => v.id === variantId);
    if (!variant) return;

    const oldPercentage = variant.trafficPercentage;
    const diff = newPercentage - oldPercentage;

    // Adjust other variants proportionally
    const others = config.variants.filter((v) => v.id !== variantId);
    const othersTotal = others.reduce((sum, v) => sum + v.trafficPercentage, 0);

    if (othersTotal === 0) {
      // Only one variant, just set it
      updateConfig({
        variants: config.variants.map((v) =>
          v.id === variantId ? { ...v, trafficPercentage: newPercentage } : v
        ),
      });
      return;
    }

    const newVariants = config.variants.map((v) => {
      if (v.id === variantId) {
        return { ...v, trafficPercentage: newPercentage };
      }
      const proportion = v.trafficPercentage / othersTotal;
      return {
        ...v,
        trafficPercentage: Math.max(0, Math.round(v.trafficPercentage - diff * proportion)),
      };
    });

    // Fix rounding
    const total = newVariants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (total !== 100) {
      const nonTarget = newVariants.find((v) => v.id !== variantId);
      if (nonTarget) {
        nonTarget.trafficPercentage += 100 - total;
      }
    }

    updateConfig({ variants: newVariants });
  };

  const totalPercentage = config.variants.reduce(
    (sum, v) => sum + v.trafficPercentage,
    0
  );
  const isValidDistribution = Math.abs(totalPercentage - 100) < 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4" />
              A/B 测试
            </CardTitle>
            <CardDescription>
              测试不同版本以优化转化率
            </CardDescription>
          </div>
          <Switch
            checked={config.isEnabled}
            onCheckedChange={(enabled) => updateConfig({ isEnabled: enabled })}
          />
        </div>
      </CardHeader>

      {config.isEnabled && (
        <CardContent className="space-y-6">
          {/* Test Name */}
          <div>
            <Label>测试名称</Label>
            <Input
              value={config.name || ''}
              onChange={(e) => updateConfig({ name: e.target.value })}
              placeholder="例如: 按钮颜色测试"
              className="mt-1"
            />
          </div>

          {/* Variants */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <Label>测试变体</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddVariantOpen(true)}
                disabled={config.variants.length >= 5}
              >
                <Plus className="mr-1 h-3 w-3" />
                添加变体
              </Button>
            </div>

            {!isValidDistribution && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-yellow-50 p-2 text-sm text-yellow-700">
                <AlertCircle className="h-4 w-4" />
                流量分配总计必须为 100%（当前: {totalPercentage}%）
              </div>
            )}

            <div className="space-y-3">
              {config.variants.map((variant) => (
                <div
                  key={variant.id}
                  className={cn(
                    'rounded-lg border p-3',
                    variant.isControl && 'border-blue-200 bg-blue-50/50'
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Input
                        value={variant.name}
                        onChange={(e) =>
                          updateVariant(variant.id, { name: e.target.value })
                        }
                        className="h-7 w-40 text-sm"
                      />
                      {variant.isControl && (
                        <Badge variant="secondary" className="text-xs">
                          对照组
                        </Badge>
                      )}
                    </div>
                    {!variant.isControl && config.variants.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeVariant(variant.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[variant.trafficPercentage]}
                      onValueChange={(values) => {
                        const v = values[0];
                        if (v !== undefined) {
                          updateTrafficDistribution(variant.id, v);
                        }
                      }}
                      className="flex-1"
                    />
                    <span className="w-12 text-right text-sm font-medium">
                      {variant.trafficPercentage}%
                    </span>
                  </div>

                  {!variant.isControl && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      可为此变体配置不同的主题颜色或区块内容
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <Label>追踪指标</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { key: 'clicks', label: '点击数' },
                { key: 'conversions', label: '转化数' },
                { key: 'timeOnPage', label: '停留时长' },
                { key: 'bounceRate', label: '跳出率' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm"
                >
                  <Checkbox
                    checked={config.metrics[key as keyof typeof config.metrics] || false}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        metrics: { ...config.metrics, [key]: checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Status indicator */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-center gap-2">
              {config.isEnabled ? (
                <>
                  <Play className="h-4 w-4 text-green-500" />
                  <span>测试运行中 - {config.variants.length} 个变体</span>
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 text-gray-400" />
                  <span>测试已暂停</span>
                </>
              )}
            </div>
            {config.winnerVariantId && (
              <div className="mt-2 flex items-center gap-2 text-amber-600">
                <Trophy className="h-4 w-4" />
                <span>
                  胜出变体:{' '}
                  {config.variants.find((v) => v.id === config.winnerVariantId)?.name}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Add Variant Dialog */}
      <Dialog open={isAddVariantOpen} onOpenChange={setIsAddVariantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加测试变体</DialogTitle>
            <DialogDescription>
              创建新的测试变体来对比不同的页面设计
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>变体名称</Label>
            <Input
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="例如: 变体 B - 绿色按钮"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddVariantOpen(false)}>
              取消
            </Button>
            <Button onClick={addVariant} disabled={!newVariantName.trim()}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
