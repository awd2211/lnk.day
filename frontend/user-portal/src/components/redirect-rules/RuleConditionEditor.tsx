import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type RuleCondition,
  type RuleConditionType,
  type RuleOperator,
  CONDITION_TYPE_LABELS,
  OPERATOR_LABELS,
  DEVICE_VALUES,
  BROWSER_VALUES,
  OS_VALUES,
  COUNTRY_CODES,
} from '@/hooks/useRedirectRules';

interface RuleConditionEditorProps {
  conditions: RuleCondition[];
  conditionLogic: 'and' | 'or';
  onChange: (conditions: RuleCondition[], logic: 'and' | 'or') => void;
  disabled?: boolean;
}

const operatorsByType: Record<RuleConditionType, RuleOperator[]> = {
  country: ['equals', 'not_equals', 'in', 'not_in'],
  device: ['equals', 'not_equals', 'in'],
  browser: ['equals', 'not_equals', 'in'],
  os: ['equals', 'not_equals', 'in'],
  language: ['equals', 'not_equals', 'starts_with', 'in'],
  time: ['between'],
  date: ['between', 'greater_than', 'less_than'],
  referrer: ['equals', 'not_equals', 'contains', 'starts_with', 'regex'],
  query_param: ['equals', 'not_equals', 'contains', 'regex'],
  cookie: ['equals', 'not_equals', 'contains'],
  ip_range: ['equals', 'in'],
  random: ['less_than'],
};

export function RuleConditionEditor({
  conditions,
  conditionLogic,
  onChange,
  disabled,
}: RuleConditionEditorProps) {
  const handleAddCondition = () => {
    const newCondition: RuleCondition = {
      type: 'country',
      operator: 'equals',
      value: '',
    };
    onChange([...conditions, newCondition], conditionLogic);
  };

  const handleRemoveCondition = (index: number) => {
    const updated = conditions.filter((_, i) => i !== index);
    onChange(updated, conditionLogic);
  };

  const handleUpdateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const updated = [...conditions];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, ...updates };
      onChange(updated, conditionLogic);
    }
  };

  const handleTypeChange = (index: number, type: RuleConditionType) => {
    const operators = operatorsByType[type];
    handleUpdateCondition(index, {
      type,
      operator: operators[0] || 'equals',
      value: '',
      key: undefined,
    });
  };

  const renderValueInput = (condition: RuleCondition, index: number) => {
    const { type, operator } = condition;

    // Key input for query_param and cookie
    if (type === 'query_param' || type === 'cookie') {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder={type === 'query_param' ? '参数名' : 'Cookie 名'}
            value={condition.key || ''}
            onChange={(e) => handleUpdateCondition(index, { key: e.target.value })}
            disabled={disabled}
          />
          <Input
            placeholder="值"
            value={condition.value as string}
            onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
            disabled={disabled}
          />
        </div>
      );
    }

    // Select for predefined values
    if (type === 'country') {
      return (
        <Select
          value={condition.value as string}
          onValueChange={(value) => handleUpdateCondition(index, { value })}
          disabled={disabled}
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

    if (type === 'device') {
      return (
        <Select
          value={condition.value as string}
          onValueChange={(value) => handleUpdateCondition(index, { value })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择设备" />
          </SelectTrigger>
          <SelectContent>
            {DEVICE_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {v === 'mobile' ? '手机' : v === 'tablet' ? '平板' : '桌面'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'browser') {
      return (
        <Select
          value={condition.value as string}
          onValueChange={(value) => handleUpdateCondition(index, { value })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择浏览器" />
          </SelectTrigger>
          <SelectContent>
            {BROWSER_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'os') {
      return (
        <Select
          value={condition.value as string}
          onValueChange={(value) => handleUpdateCondition(index, { value })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择操作系统" />
          </SelectTrigger>
          <SelectContent>
            {OS_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {v === 'windows'
                  ? 'Windows'
                  : v === 'macos'
                    ? 'macOS'
                    : v === 'linux'
                      ? 'Linux'
                      : v === 'ios'
                        ? 'iOS'
                        : 'Android'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'random') {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            max="100"
            placeholder="1-100"
            value={condition.value as string}
            onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
            disabled={disabled}
            className="w-24"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      );
    }

    if (operator === 'between' && (type === 'time' || type === 'date')) {
      const value = condition.value as { start: string; end: string } | undefined;
      return (
        <div className="flex items-center gap-2">
          <Input
            type={type === 'time' ? 'time' : 'date'}
            value={value?.start || ''}
            onChange={(e) =>
              handleUpdateCondition(index, {
                value: { start: e.target.value, end: value?.end || '' },
              })
            }
            disabled={disabled}
          />
          <span className="text-gray-500">至</span>
          <Input
            type={type === 'time' ? 'time' : 'date'}
            value={value?.end || ''}
            onChange={(e) =>
              handleUpdateCondition(index, {
                value: { start: value?.start || '', end: e.target.value },
              })
            }
            disabled={disabled}
          />
        </div>
      );
    }

    // Default text input
    return (
      <Input
        placeholder="值"
        value={condition.value as string}
        onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>匹配条件</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">条件关系：</span>
          <Select
            value={conditionLogic}
            onValueChange={(value: 'and' | 'or') => onChange(conditions, value)}
            disabled={disabled}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">全部满足</SelectItem>
              <SelectItem value="or">任一满足</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {conditions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            暂无条件，点击下方按钮添加
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-lg border bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div className="grid flex-1 gap-2 md:grid-cols-3">
                <Select
                  value={condition.type}
                  onValueChange={(value) => handleTypeChange(index, value as RuleConditionType)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_TYPE_LABELS).map(([type, info]) => (
                      <SelectItem key={type} value={type}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={condition.operator}
                  onValueChange={(value) =>
                    handleUpdateCondition(index, { operator: value as RuleOperator })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operatorsByType[condition.type].map((op) => (
                      <SelectItem key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {renderValueInput(condition, index)}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCondition(index)}
                disabled={disabled}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddCondition}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        添加条件
      </Button>
    </div>
  );
}
