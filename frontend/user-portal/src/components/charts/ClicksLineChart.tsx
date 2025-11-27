import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ClickData {
  date: string;
  clicks: number;
}

interface ClicksLineChartProps {
  data: ClickData[];
  height?: number;
}

export function ClicksLineChart({ data, height = 300 }: ClicksLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500" style={{ height }}>
        暂无数据
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    displayDate: format(parseISO(item.date), 'MM/dd', { locale: zhCN }),
    fullDate: format(parseISO(item.date), 'yyyy年MM月dd日', { locale: zhCN }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="displayDate"
          tick={{ fontSize: 12, fill: '#666' }}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#666' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => value.toLocaleString()}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          formatter={(value: number) => [value.toLocaleString(), '点击量']}
          labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
        />
        <Line
          type="monotone"
          dataKey="clicks"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
