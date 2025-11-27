import { Tooltip } from 'recharts';
import { useMemo } from 'react';

interface HourlyData {
  hour: number;
  day: number; // 0 = Sunday, 1 = Monday, etc.
  clicks: number;
}

interface HourlyHeatmapProps {
  data: HourlyData[];
  height?: number;
}

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(value: number, max: number): string {
  if (value === 0) return '#f3f4f6';
  const intensity = Math.min(value / max, 1);
  // Blue gradient: from light blue to dark blue
  const r = Math.round(239 - intensity * 180);
  const g = Math.round(246 - intensity * 160);
  const b = Math.round(255 - intensity * 50);
  return `rgb(${r}, ${g}, ${b})`;
}

export function HourlyHeatmap({ data, height = 200 }: HourlyHeatmapProps) {
  const { grid, maxValue } = useMemo(() => {
    // Initialize 7x24 grid
    const gridData: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );

    let max = 0;
    data.forEach(({ hour, day, clicks }) => {
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        gridData[day]![hour] = clicks;
        max = Math.max(max, clicks);
      }
    });

    return { grid: gridData, maxValue: max || 1 };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500" style={{ height }}>
        暂无数据
      </div>
    );
  }

  const cellSize = Math.min(20, (height - 40) / 7);
  const cellGap = 2;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex items-center mb-1">
          <div className="w-12" />
          <div className="flex flex-1">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-xs text-gray-500"
                style={{ minWidth: cellSize + cellGap }}
              >
                {hour % 3 === 0 ? `${hour}时` : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap grid */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex items-center mb-[2px]">
            <div className="w-12 text-xs text-gray-500 text-right pr-2">{day}</div>
            <div className="flex flex-1 gap-[2px]">
              {HOURS.map((hour) => {
                const value = grid[dayIndex]![hour]!;
                return (
                  <div
                    key={hour}
                    className="rounded-sm transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(value, maxValue),
                      flex: 1,
                      minWidth: cellSize,
                    }}
                    title={`${day} ${hour}:00 - ${value.toLocaleString()} 次点击`}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-end mt-3 gap-2">
          <span className="text-xs text-gray-500">少</span>
          <div className="flex gap-[2px]">
            {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(intensity * maxValue, maxValue) }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">多</span>
        </div>
      </div>
    </div>
  );
}
