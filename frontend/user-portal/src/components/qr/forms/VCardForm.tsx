import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VCardContent } from '../qr-types';

interface VCardFormProps {
  value: VCardContent;
  onChange: (value: VCardContent) => void;
}

export default function VCardForm({ value, onChange }: VCardFormProps) {
  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <div className="rounded-lg border p-4">
        <h4 className="mb-3 font-medium text-sm">基本信息</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">名 *</Label>
            <Input
              id="firstName"
              value={value.firstName}
              onChange={(e) => onChange({ ...value, firstName: e.target.value })}
              placeholder="三"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="lastName">姓</Label>
            <Input
              id="lastName"
              value={value.lastName || ''}
              onChange={(e) => onChange({ ...value, lastName: e.target.value })}
              placeholder="张"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="organization">公司/组织</Label>
            <Input
              id="organization"
              value={value.organization || ''}
              onChange={(e) => onChange({ ...value, organization: e.target.value })}
              placeholder="ABC 科技有限公司"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="title">职位</Label>
            <Input
              id="title"
              value={value.title || ''}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="产品经理"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* 联系方式 */}
      <div className="rounded-lg border p-4">
        <h4 className="mb-3 font-medium text-sm">联系方式</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mobile">手机</Label>
            <Input
              id="mobile"
              type="tel"
              value={value.mobile || ''}
              onChange={(e) => onChange({ ...value, mobile: e.target.value })}
              placeholder="+86 138 1234 5678"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="vphone">工作电话</Label>
            <Input
              id="vphone"
              type="tel"
              value={value.phone || ''}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
              placeholder="010-12345678"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vemail">邮箱</Label>
            <Input
              id="vemail"
              type="email"
              value={value.email || ''}
              onChange={(e) => onChange({ ...value, email: e.target.value })}
              placeholder="contact@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fax">传真</Label>
            <Input
              id="fax"
              type="tel"
              value={value.fax || ''}
              onChange={(e) => onChange({ ...value, fax: e.target.value })}
              placeholder="010-87654321"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="website">网站</Label>
          <Input
            id="website"
            type="url"
            value={value.website || ''}
            onChange={(e) => onChange({ ...value, website: e.target.value })}
            placeholder="https://www.example.com"
            className="mt-1"
          />
        </div>
      </div>

      {/* 地址 */}
      <div className="rounded-lg border p-4">
        <h4 className="mb-3 font-medium text-sm">地址</h4>
        <div>
          <Label htmlFor="street">街道地址</Label>
          <Input
            id="street"
            value={value.street || ''}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder="朝阳区 XX 路 XX 号"
            className="mt-1"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">城市</Label>
            <Input
              id="city"
              value={value.city || ''}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              placeholder="北京"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="state">省/州</Label>
            <Input
              id="state"
              value={value.state || ''}
              onChange={(e) => onChange({ ...value, state: e.target.value })}
              placeholder="北京市"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="zip">邮编</Label>
            <Input
              id="zip"
              value={value.zip || ''}
              onChange={(e) => onChange({ ...value, zip: e.target.value })}
              placeholder="100000"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="country">国家</Label>
            <Input
              id="country"
              value={value.country || ''}
              onChange={(e) => onChange({ ...value, country: e.target.value })}
              placeholder="中国"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* 备注 */}
      <div>
        <Label htmlFor="note">备注</Label>
        <Textarea
          id="note"
          value={value.note || ''}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder="添加备注信息..."
          rows={2}
          className="mt-1"
        />
      </div>
    </div>
  );
}
