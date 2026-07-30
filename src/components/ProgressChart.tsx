'use client';

// Courbe de progression, basee sur recharts.
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function ProgressChart({
  data,
  color = '#6C5CE7',
  height = 190,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="-mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.42} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#5A6376', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={22}
          />
          <YAxis
            tick={{ fill: '#5A6376', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={38}
            domain={['dataMin - 4', 'dataMax + 4']}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
            contentStyle={{
              background: '#161A22',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              fontSize: 12,
              color: '#DFE4EC',
              padding: '8px 12px',
            }}
            labelStyle={{ color: '#8891A5', marginBottom: 2 }}
            formatter={(v: number) => [v, '']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.6}
            fill={`url(#fill-${color.replace('#', '')})`}
            dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
