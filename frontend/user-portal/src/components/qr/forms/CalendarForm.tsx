import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CalendarContent } from '../qr-types';

interface CalendarFormProps {
  value: CalendarContent;
  onChange: (value: CalendarContent) => void;
}

export default function CalendarForm({ value, onChange }: CalendarFormProps) {
  // 格式化日期为 datetime-local 输入格式
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  };

  // 格式化日期为 date 输入格式
  const formatDateOnlyForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 10);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">事件标题 *</Label>
        <Input
          id="title"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="团队会议"
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="allDay" className="font-normal">全天事件</Label>
          <p className="text-xs text-gray-500">不设置具体时间</p>
        </div>
        <Switch
          id="allDay"
          checked={value.allDay || false}
          onCheckedChange={(checked) => onChange({ ...value, allDay: checked })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">开始时间 *</Label>
          {value.allDay ? (
            <Input
              id="startTime"
              type="date"
              value={formatDateOnlyForInput(value.startTime)}
              onChange={(e) => onChange({ ...value, startTime: e.target.value })}
              className="mt-1"
            />
          ) : (
            <Input
              id="startTime"
              type="datetime-local"
              value={formatDateForInput(value.startTime)}
              onChange={(e) => onChange({ ...value, startTime: e.target.value })}
              className="mt-1"
            />
          )}
        </div>
        <div>
          <Label htmlFor="endTime">结束时间 *</Label>
          {value.allDay ? (
            <Input
              id="endTime"
              type="date"
              value={formatDateOnlyForInput(value.endTime)}
              onChange={(e) => onChange({ ...value, endTime: e.target.value })}
              className="mt-1"
            />
          ) : (
            <Input
              id="endTime"
              type="datetime-local"
              value={formatDateForInput(value.endTime)}
              onChange={(e) => onChange({ ...value, endTime: e.target.value })}
              className="mt-1"
            />
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="location">地点</Label>
        <Input
          id="location"
          value={value.location || ''}
          onChange={(e) => onChange({ ...value, location: e.target.value })}
          placeholder="会议室 A / 线上会议"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">事件描述</Label>
        <Textarea
          id="description"
          value={value.description || ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="输入事件详情..."
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        扫码后将添加此事件到日历应用
      </div>
    </div>
  );
}
