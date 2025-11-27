import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-6 text-lg font-semibold">常规设置</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="siteName">站点名称</Label>
            <Input id="siteName" defaultValue="lnk.day" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="defaultDomain">默认域名</Label>
            <Input id="defaultDomain" defaultValue="lnk.day" />
          </div>
          <Button>保存设置</Button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-6 text-lg font-semibold">API 设置</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="rateLimit">API 请求限制 (每分钟)</Label>
            <Input id="rateLimit" type="number" defaultValue="60" />
          </div>
          <Button>保存设置</Button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-6 text-lg font-semibold">邮件设置</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="smtpHost">SMTP 服务器</Label>
            <Input id="smtpHost" placeholder="smtp.example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtpPort">SMTP 端口</Label>
            <Input id="smtpPort" type="number" placeholder="587" />
          </div>
          <Button>保存设置</Button>
        </div>
      </div>
    </div>
  );
}
