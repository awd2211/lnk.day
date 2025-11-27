import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DeviceData {
  device: string;
  clicks: number;
  percentage: number;
}

interface DevicePieChartProps {
  data: DeviceData[];
  height?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DEVICE_ICONS: Record<string, string> = {
  desktop: '💻',
  mobile: '📱',
  tablet: '📲',
  unknown: '❓',
};

export function DevicePieChart({ data, height = 300 }: DevicePieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500" style={{ height }}>
        暂无数据
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    name: item.device || '未知',
    icon: DEVICE_ICONS[item.device?.toLowerCase()] || '❓',
  }));

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={100}
          dataKey="clicks"
        >
          {formattedData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          formatter={(value: number, name: string, props: any) => [
            `${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
            props.payload.icon + ' ' + name,
          ]}
        />
        <Legend
          formatter={(value, entry: any) => (
            <span className="text-sm">
              {entry.payload.icon} {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
