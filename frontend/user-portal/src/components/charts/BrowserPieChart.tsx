import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface BrowserData {
  browser: string;
  clicks: number;
  percentage: number;
}

interface BrowserPieChartProps {
  data: BrowserData[];
  height?: number;
}

const COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#fffbeb'];

const BROWSER_ICONS: Record<string, string> = {
  chrome: '🌐',
  firefox: '🦊',
  safari: '🧭',
  edge: '🔷',
  opera: '🔴',
  ie: '📘',
  unknown: '❓',
};

export function BrowserPieChart({ data, height = 300 }: BrowserPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500" style={{ height }}>
        暂无数据
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    name: item.browser || '未知',
    icon: BROWSER_ICONS[item.browser?.toLowerCase()] || '🌐',
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
