import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneContent } from '../qr-types';

interface PhoneFormProps {
  value: PhoneContent;
  onChange: (value: PhoneContent) => void;
}

export default function PhoneForm({ value, onChange }: PhoneFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="phone">电话号码 *</Label>
        <Input
          id="phone"
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="+86 138 1234 5678"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-gray-500">
          扫码后将直接拨打此号码
        </p>
      </div>
    </div>
  );
}
