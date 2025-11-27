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

interface ReferrerData {
  referrer: string;
  clicks: number;
  percentage: number;
}

interface ReferrerChartProps {
  data: ReferrerData[];
  height?: number;
  maxItems?: number;
}

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5'];

function formatReferrer(referrer: string): string {
  if (!referrer || referrer === 'direct' || referrer === '(direct)') {
    return '直接访问';
  }
  try {
    const url = new URL(referrer.startsWith('http') ? referrer : `https://${referrer}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return referrer.length > 20 ? referrer.slice(0, 20) + '...' : referrer;
  }
}

export function ReferrerChart({ data, height = 300, maxItems = 6 }: ReferrerChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500" style={{ height }}>
        暂无数据
      </div>
    );
  }

  const formattedData = data.slice(0, maxItems).map((item) => ({
    ...item,
    displayName: formatReferrer(item.referrer),
    originalName: item.referrer || '直接访问',
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={formattedData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
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
          width={70}
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
          labelFormatter={(_, payload) => `来源: ${payload[0]?.payload?.originalName || ''}`}
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
