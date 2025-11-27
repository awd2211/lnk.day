import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface GeoData {
  country: string;
  clicks: number;
  percentage: number;
}

interface GeoBarChartProps {
  data: GeoData[];
  height?: number;
  maxItems?: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  CN: '中国',
  US: '美国',
  JP: '日本',
  KR: '韩国',
  GB: '英国',
  DE: '德国',
  FR: '法国',
  CA: '加拿大',
  AU: '澳大利亚',
  IN: '印度',
  BR: '巴西',
  RU: '俄罗斯',
  SG: '新加坡',
  HK: '中国香港',
  TW: '中国台湾',
};

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'];

export function GeoBarChart({ data, height = 300, maxItems = 6 }: GeoBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500" style={{ height }}>
        暂无数据
      </div>
    );
  }

  const formattedData = data.slice(0, maxItems).map((item) => ({
    ...item,
    name: COUNTRY_NAMES[item.country] || item.country || '未知',
    displayName: COUNTRY_NAMES[item.country] || item.country || '未知',
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={formattedData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: '#666' }}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
          tickFormatter={(value) => value.toLocaleString()}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          tick={{ fontSize: 12, fill: '#666' }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          formatter={(value: number, _, props: any) => [
            `${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
            '点击量',
          ]}
          labelFormatter={(label) => `地区: ${label}`}
        />
        <Bar dataKey="clicks" radius={[0, 4, 4, 0]}>
          {formattedData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
