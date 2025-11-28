import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { WiFiContent } from '../qr-types';

interface WiFiFormProps {
  value: WiFiContent;
  onChange: (value: WiFiContent) => void;
}

export default function WiFiForm({ value, onChange }: WiFiFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="ssid">网络名称 (SSID) *</Label>
        <Input
          id="ssid"
          value={value.ssid}
          onChange={(e) => onChange({ ...value, ssid: e.target.value })}
          placeholder="My WiFi Network"
          className="mt-1"
        />
      </div>
      <div>
        <Label>加密类型</Label>
        <Select
          value={value.encryption}
          onValueChange={(v) => onChange({ ...value, encryption: v as 'WPA' | 'WEP' | 'nopass' })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WPA">WPA/WPA2/WPA3</SelectItem>
            <SelectItem value="WEP">WEP</SelectItem>
            <SelectItem value="nopass">无密码</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.encryption !== 'nopass' && (
        <div>
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            value={value.password || ''}
            onChange={(e) => onChange({ ...value, password: e.target.value })}
            placeholder="WiFi 密码"
            className="mt-1"
          />
        </div>
      )}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="hidden" className="font-normal">隐藏网络</Label>
          <p className="text-xs text-gray-500">网络不广播 SSID</p>
        </div>
        <Switch
          id="hidden"
          checked={value.hidden || false}
          onCheckedChange={(checked) => onChange({ ...value, hidden: checked })}
        />
      </div>
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        扫码后将自动连接此 WiFi 网络
      </div>
    </div>
  );
}
