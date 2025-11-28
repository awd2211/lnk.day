import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SMSContent } from '../qr-types';

interface SMSFormProps {
  value: SMSContent;
  onChange: (value: SMSContent) => void;
}

export default function SMSForm({ value, onChange }: SMSFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="phone">收件人号码 *</Label>
        <Input
          id="phone"
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="+86 138 1234 5678"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="message">短信内容</Label>
        <Textarea
          id="message"
          value={value.message || ''}
          onChange={(e) => onChange({ ...value, message: e.target.value })}
          placeholder="输入预设短信内容..."
          rows={3}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-gray-500">
          扫码后打开短信应用并预填内容
        </p>
      </div>
    </div>
  );
}
