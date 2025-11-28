import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmailContent } from '../qr-types';

interface EmailFormProps {
  value: EmailContent;
  onChange: (value: EmailContent) => void;
}

export default function EmailForm({ value, onChange }: EmailFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="to">收件人 *</Label>
        <Input
          id="to"
          type="email"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          placeholder="example@email.com"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="subject">邮件主题</Label>
        <Input
          id="subject"
          value={value.subject || ''}
          onChange={(e) => onChange({ ...value, subject: e.target.value })}
          placeholder="输入邮件主题"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="body">邮件正文</Label>
        <Textarea
          id="body"
          value={value.body || ''}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
          placeholder="输入预设邮件内容..."
          rows={3}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cc">抄送 (CC)</Label>
          <Input
            id="cc"
            type="email"
            value={value.cc || ''}
            onChange={(e) => onChange({ ...value, cc: e.target.value })}
            placeholder="cc@email.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="bcc">密送 (BCC)</Label>
          <Input
            id="bcc"
            type="email"
            value={value.bcc || ''}
            onChange={(e) => onChange({ ...value, bcc: e.target.value })}
            placeholder="bcc@email.com"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
