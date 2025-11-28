import { useState } from 'react';
import {
  Mail,
  Plus,
  X,
  CalendarClock,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  useScheduleReport,
  ReportType,
  ReportFormat,
  ReportSchedule,
  REPORT_TYPE_LABELS,
  REPORT_METRICS,
  SCHEDULE_LABELS,
  FORMAT_LABELS,
} from '@/hooks/useReports';
import { cn } from '@/lib/utils';

interface ScheduleReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ScheduleReportDialog({
  open,
  onOpenChange,
}: ScheduleReportDialogProps) {
  const { toast } = useToast();
  const scheduleReport = useScheduleReport();

  const [formData, setFormData] = useState({
    name: '',
    type: 'summary' as ReportType,
    dateRangeDays: 7,
    metrics: ['clicks', 'unique_clicks', 'devices', 'countries'] as string[],
    format: 'pdf' as ReportFormat,
    schedule: 'weekly' as ReportSchedule,
    recipients: [] as string[],
    newRecipient: '',
  });

  const addRecipient = () => {
    const email = formData.newRecipient.trim();
    if (!email || !email.includes('@')) {
      toast({ title: '请输入有效的邮箱地址', variant: 'destructive' });
      return;
    }
    if (formData.recipients.includes(email)) {
      toast({ title: '该邮箱已添加', variant: 'destructive' });
      return;
    }
    setFormData({
      ...formData,
      recipients: [...formData.recipients, email],
      newRecipient: '',
    });
  };

  const removeRecipient = (email: string) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((r) => r !== email),
    });
  };

  const toggleMetric = (metricId: string) => {
    setFormData((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter((m) => m !== metricId)
        : [...prev.metrics, metricId],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: '请输入报告名称', variant: 'destructive' });
      return;
    }
    if (formData.metrics.length === 0) {
      toast({ title: '请至少选择一个指标', variant: 'destructive' });
      return;
    }
    if (formData.recipients.length === 0) {
      toast({ title: '请至少添加一个收件人', variant: 'destructive' });
      return;
    }

    try {
      await scheduleReport.mutateAsync({
        name: formData.name,
        type: formData.type,
        dateRange: {
          start: format(subDays(new Date(), formData.dateRangeDays), 'yyyy-MM-dd'),
          end: format(new Date(), 'yyyy-MM-dd'),
        },
        metrics: formData.metrics,
        format: formData.format,
        schedule: formData.schedule,
        recipients: formData.recipients,
      });
      toast({ title: '定时报告创建成功' });
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        type: 'summary',
        dateRangeDays: 7,
        metrics: ['clicks', 'unique_clicks', 'devices', 'countries'],
        format: 'pdf',
        schedule: 'weekly',
        recipients: [],
        newRecipient: '',
      });
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            创建定时报告
          </DialogTitle>
          <DialogDescription>
            设置自动生成并发送报告的计划
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 报告名称 */}
          <div>
            <Label htmlFor="schedule-name">报告名称 *</Label>
            <Input
              id="schedule-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: 每周数据周报"
              className="mt-1"
            />
          </div>

          {/* 报告类型 */}
          <div>
            <Label>报告类型</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v as ReportType })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_TYPE_LABELS).map(([type, { label, description }]) => (
                  <SelectItem key={type} value={type}>
                    <div>
                      <span className="font-medium">{label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 发送频率 */}
          <div>
            <Label>发送频率 *</Label>
            <div className="mt-2 flex gap-2">
              {(['daily', 'weekly', 'monthly'] as ReportSchedule[]).map((schedule) => (
                <Button
                  key={schedule}
                  variant={formData.schedule === schedule ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, schedule })}
                >
                  {SCHEDULE_LABELS[schedule]}
                </Button>
              ))}
            </div>
          </div>

          {/* 数据范围 */}
          <div>
            <Label>数据范围</Label>
            <Select
              value={String(formData.dateRangeDays)}
              onValueChange={(v) => setFormData({ ...formData, dateRangeDays: parseInt(v) })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">最近 7 天</SelectItem>
                <SelectItem value="14">最近 14 天</SelectItem>
                <SelectItem value="30">最近 30 天</SelectItem>
                <SelectItem value="90">最近 90 天</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              报告生成时会自动计算相对日期范围
            </p>
          </div>

          {/* 包含指标 */}
          <div>
            <Label>包含指标</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REPORT_METRICS.slice(0, 9).map((metric) => (
                <label
                  key={metric.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    checked={formData.metrics.includes(metric.id)}
                    onCheckedChange={() => toggleMetric(metric.id)}
                  />
                  {metric.label}
                </label>
              ))}
            </div>
          </div>

          {/* 输出格式 */}
          <div>
            <Label>输出格式</Label>
            <div className="mt-2 flex gap-2">
              {(Object.entries(FORMAT_LABELS) as [ReportFormat, { label: string }][]).map(
                ([format, { label }]) => (
                  <Button
                    key={format}
                    variant={formData.format === format ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, format })}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {label}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* 收件人 */}
          <div>
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              收件人 *
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                type="email"
                value={formData.newRecipient}
                onChange={(e) => setFormData({ ...formData, newRecipient: e.target.value })}
                placeholder="输入邮箱地址"
                onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
              />
              <Button onClick={addRecipient} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.recipients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.recipients.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
                  >
                    {email}
                    <button
                      onClick={() => removeRecipient(email)}
                      className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              报告生成后会自动发送到这些邮箱
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={scheduleReport.isPending}>
            {scheduleReport.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                创建中...
              </>
            ) : (
              '创建定时报告'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
