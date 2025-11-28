import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface Variant {
  id?: string;
  name: string;
  url: string;
  weight: number;
}

interface VariantEditorProps {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
  disabled?: boolean;
}

export function VariantEditor({ variants, onChange, disabled }: VariantEditorProps) {
  const [localVariants, setLocalVariants] = useState<Variant[]>(
    variants.length > 0
      ? variants.map((v) => ({
          id: v.id,
          name: v.name ?? '',
          url: v.url ?? '',
          weight: v.weight ?? 0,
        }))
      : [
          { name: '对照组 (A)', url: '', weight: 50 },
          { name: '变体 (B)', url: '', weight: 50 },
        ]
  );

  const handleUpdate = (index: number, field: keyof Variant, value: string | number) => {
    const updated = [...localVariants];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setLocalVariants(updated);
      onChange(updated);
    }
  };

  const handleWeightChange = (index: number, newWeight: number) => {
    const updated = [...localVariants];
    const current = updated[index];
    if (!current) return;

    const oldWeight = current.weight;
    const diff = newWeight - oldWeight;

    // Distribute the difference among other variants
    const otherVariants = updated.filter((_, i) => i !== index);
    const totalOtherWeight = otherVariants.reduce((sum, v) => sum + v.weight, 0);

    if (totalOtherWeight === 0) return;

    updated[index] = { ...current, weight: newWeight };

    // Proportionally adjust other weights
    otherVariants.forEach((v, i) => {
      const actualIndex = i >= index ? i + 1 : i;
      const proportion = v.weight / totalOtherWeight;
      const target = updated[actualIndex];
      if (target) {
        updated[actualIndex] = { ...target, weight: Math.max(0, v.weight - diff * proportion) };
      }
    });

    // Normalize to ensure total is 100
    const total = updated.reduce((sum, v) => sum + v.weight, 0);
    if (total !== 100) {
      const factor = 100 / total;
      updated.forEach((v, i) => {
        const item = updated[i];
        if (item) {
          updated[i] = { ...item, weight: Math.round(v.weight * factor * 10) / 10 };
        }
      });
    }

    setLocalVariants(updated);
    onChange(updated);
  };

  const handleAdd = () => {
    const newVariant: Variant = {
      name: `变体 (${String.fromCharCode(65 + localVariants.length)})`,
      url: '',
      weight: 0,
    };

    // Redistribute weights
    const newWeight = Math.floor(100 / (localVariants.length + 1));
    const updated = localVariants.map((v) => ({
      ...v,
      weight: newWeight,
    }));
    updated.push({ ...newVariant, weight: 100 - newWeight * localVariants.length });

    setLocalVariants(updated);
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    if (localVariants.length <= 2) return;

    const removed = localVariants[index];
    if (!removed) return;

    const updated = localVariants.filter((_, i) => i !== index);

    // Redistribute the removed weight
    const redistributeEach = removed.weight / updated.length;
    const redistributed = updated.map((v) => ({
      ...v,
      weight: Math.round((v.weight + redistributeEach) * 10) / 10,
    }));

    setLocalVariants(redistributed);
    onChange(redistributed);
  };

  const handleDistributeEvenly = () => {
    const evenWeight = Math.floor(100 / localVariants.length);
    const remainder = 100 - evenWeight * localVariants.length;

    const updated = localVariants.map((v, i) => ({
      ...v,
      weight: evenWeight + (i === 0 ? remainder : 0),
    }));

    setLocalVariants(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium dark:text-white">变体配置</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            至少需要 2 个变体进行 A/B 测试
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDistributeEvenly}
            disabled={disabled}
          >
            均分流量
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={disabled || localVariants.length >= 5}
          >
            <Plus className="mr-1 h-4 w-4" />
            添加变体
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {localVariants.map((variant, index) => (
          <div
            key={index}
            className="rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  变体 {index + 1}
                </span>
                {index === 0 && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    对照组
                  </span>
                )}
              </div>
              {localVariants.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor={`variant-name-${index}`}>名称</Label>
                <Input
                  id={`variant-name-${index}`}
                  value={variant.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder="变体名称"
                  className="mt-1"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label htmlFor={`variant-url-${index}`}>目标 URL</Label>
                <Input
                  id={`variant-url-${index}`}
                  value={variant.url}
                  onChange={(e) => handleUpdate(index, 'url', e.target.value)}
                  placeholder="https://example.com/landing-page"
                  className="mt-1"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <Label>流量分配</Label>
                <span className="text-sm font-medium dark:text-white">
                  {variant.weight.toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[variant.weight]}
                onValueChange={(values: number[]) => {
                  const value = values[0];
                  if (value !== undefined) {
                    handleWeightChange(index, value);
                  }
                }}
                max={100}
                step={0.1}
                className="mt-2"
                disabled={disabled}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Weight summary */}
      <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-300">总流量分配</span>
        <span
          className={`text-sm font-medium ${
            Math.abs(localVariants.reduce((sum, v) => sum + v.weight, 0) - 100) < 0.1
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {localVariants.reduce((sum, v) => sum + v.weight, 0).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
