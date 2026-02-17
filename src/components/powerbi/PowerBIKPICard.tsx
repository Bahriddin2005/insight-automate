/**
 * Premium KPI Card — Dark Luxury FinTech
 * Soft glow, micro-sparkline, animated value, luxury gold accent for highlights
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { formatExecutive } from '@/lib/formatNumber';

interface Props {
  label: string;
  value: number;
  format?: 'number' | 'percent' | 'currency';
  period?: string;
  growth?: number | null;
  growthLabel?: string;
  sparklineData?: { value: number }[];
  premium?: boolean;
}

export default function PowerBIKPICard({
  label, value, format = 'number', growth, growthLabel = 'vs last month',
  sparklineData, premium = false,
}: Props) {
  const formatted = format === 'percent'
    ? `${value.toFixed(1)}%`
    : format === 'currency'
      ? formatExecutive(value, 'currency')
      : formatExecutive(value);

  const hasGrowth = growth != null && !Number.isNaN(growth);
  const isPositive = hasGrowth && growth >= 0;
  const isNegative = hasGrowth && growth < 0;

  const spark = useMemo(() => {
    if (!sparklineData?.length) return null;
    const arr = sparklineData.map(d => d.value);
    const min = Math.min(...arr);
    const max = Math.max(...arr) || 1;
    return arr.map(v => ({ value: (v - min) / (max - min || 1) }));
  }, [sparklineData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="dlux-kpi"
    >
      <p className="dlux-kpi-label truncate">{label}</p>
      <p className={`dlux-kpi-value mt-0.5 tabular-nums ${premium ? 'text-[#C8A24D]' : ''}`}>
        {formatted}
      </p>
      {hasGrowth && (
        <p className={`dlux-kpi-growth flex items-center gap-1.5 tabular-nums ${
          isPositive ? 'text-[#14F195]' : isNegative ? 'text-[#FF4D4F]' : 'text-[#9CA3AF]'
        }`}>
          {isPositive && <TrendingUp className="w-3.5 h-3.5" />}
          {isNegative && <TrendingDown className="w-3.5 h-3.5" />}
          {growth! >= 0 ? '+' : ''}{growth!.toFixed(1)}% {growthLabel}
        </p>
      )}
      {spark && spark.length > 0 && (
        <div className="mt-3 h-8 -mx-2 opacity-50">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="#00D4FF" strokeWidth={1} fill={`url(#spark-${label.replace(/\s/g, '-')})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
