/**
 * Waterfall Chart — Variance Analysis
 * Increase: Emerald | Decrease: Red | Total: Cyan (dark luxury)
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { formatExecutive } from '@/lib/formatNumber';

interface WaterfallItem {
  name: string;
  value: number;
  type: 'start' | 'increase' | 'decrease' | 'end';
}

interface Props {
  data: WaterfallItem[];
  dark?: boolean;
}

const COLORS = {
  increase: '#14F195',
  decrease: '#FF4D4F',
  total: '#00D4FF',
  start: '#9CA3AF',
};

export default function PowerBIWaterfall({ data, dark = true }: Props) {
  if (!data?.length) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }} barCategoryGap="30%">
        <XAxis type="number" tick={{ fontSize: 10, fill: dark ? '#9CA3AF' : '#6B7280' }} tickFormatter={v => formatExecutive(v, 'short')} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: dark ? '#9CA3AF' : '#6B7280' }} width={90} />
        <Tooltip
          contentStyle={dark ? { background: '#111827', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, fontSize: 11, color: '#E5E7EB' } : { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 11 }}
          formatter={(v: number) => [formatExecutive(v, 'short'), 'Value']}
        />
        <ReferenceLine x={0} stroke={dark ? 'rgba(255,255,255,0.06)' : '#E5E7EB'} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} minPointSize={4} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.type === 'increase' ? COLORS.increase
                  : entry.type === 'decrease' ? COLORS.decrease
                    : entry.type === 'end' ? COLORS.total
                      : COLORS.start
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
