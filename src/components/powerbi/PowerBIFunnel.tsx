/**
 * Funnel Chart — Pipeline / Conversion
 * Horizontal premium layout, dark luxury cyan/emerald
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { formatExecutive } from '@/lib/formatNumber';

interface FunnelItem {
  name: string;
  value: number;
  fill?: string;
}

interface Props {
  data: FunnelItem[];
  dark?: boolean;
}

const FUNNEL_COLORS = ['#00D4FF', '#14F195', '#00D4FF', '#14F195', '#C8A24D', '#9CA3AF'];

export default function PowerBIFunnel({ data, dark = true }: Props) {
  if (!data?.length) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const enriched = data.map((d, i) => ({
    ...d,
    fill: d.fill ?? FUNNEL_COLORS[i % FUNNEL_COLORS.length],
    pct: d.value && maxVal ? ((d.value / maxVal) * 100).toFixed(1) : '0',
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={enriched} layout="vertical" margin={{ left: 0, right: 20 }} barCategoryGap="20%" barGap={4}>
        <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 10, fill: dark ? '#9CA3AF' : '#6B7280' }} tickFormatter={v => formatExecutive(v, 'short')} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: dark ? '#9CA3AF' : '#6B7280' }} width={90} />
        <Tooltip
          contentStyle={dark ? { background: '#111827', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, fontSize: 11, color: '#E5E7EB' } : { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 11 }}
          formatter={(v: number, _n: string, entry: { payload?: { pct?: string } }) =>
            [formatExecutive(v, 'short') + (entry?.payload?.pct ? ` (${entry.payload.pct}%)` : ''), 'Value']}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={36}>
          {enriched.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
          <LabelList dataKey="value" position="right" fontSize={10} fill={dark ? '#E5E7EB' : '#374151'} formatter={(v: number, _n: string, props: { payload?: { pct?: string } }) =>
            `${formatExecutive(v, 'short')} (${props?.payload?.pct ?? '0'}%)`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
