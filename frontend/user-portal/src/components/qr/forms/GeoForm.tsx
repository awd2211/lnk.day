import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GeoContent } from '../qr-types';

interface GeoFormProps {
  value: GeoContent;
  onChange: (value: GeoContent) => void;
}

export default function GeoForm({ value, onChange }: GeoFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="latitude">纬度 *</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            value={value.latitude || ''}
            onChange={(e) => onChange({ ...value, latitude: parseFloat(e.target.value) || 0 })}
            placeholder="39.9042"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="longitude">经度 *</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            value={value.longitude || ''}
            onChange={(e) => onChange({ ...value, longitude: parseFloat(e.target.value) || 0 })}
            placeholder="116.4074"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="query">地点名称</Label>
        <Input
          id="query"
          value={value.query || ''}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder="天安门广场"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-gray-500">
          可选，在地图应用中显示的位置名称
        </p>
      </div>

      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        扫码后将在地图应用中打开此位置
      </div>

      <div className="rounded-lg border p-4">
        <h4 className="mb-2 text-sm font-medium">常用坐标参考</h4>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>北京天安门</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => onChange({ latitude: 39.9042, longitude: 116.4074, query: '天安门广场' })}
            >
              使用
            </button>
          </div>
          <div className="flex justify-between">
            <span>上海东方明珠</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => onChange({ latitude: 31.2397, longitude: 121.4998, query: '东方明珠' })}
            >
              使用
            </button>
          </div>
          <div className="flex justify-between">
            <span>广州塔</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => onChange({ latitude: 23.1066, longitude: 113.3245, query: '广州塔' })}
            >
              使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
