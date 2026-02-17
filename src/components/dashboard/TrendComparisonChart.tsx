import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, Area,
} from 'recharts';
import type { DatasetAnalysis, ColumnInfo } from '@/lib/dataProcessor';

function findCol(columns: ColumnInfo[], aliases: string[]): ColumnInfo | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
  for (const a of aliases.map(norm)) {
    const f = columns.find(c => norm(c.name) === a || norm(c.name).includes(a));
    if (f) return f;
  }
  return undefined;
}

function computeMA(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
    borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '11px',
    fontFamily: '"JetBrains Mono", monospace',
  },
};

interface Props {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
}

export default function TrendComparisonChart({ analysis, filteredData }: Props) {
  const dateCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'datetime'), ['date', 'timestamp', 'created at', 'time', 'order date']),
    [analysis.columnInfo]
  );
  const numCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'numeric'), ['revenue', 'sales', 'amount', 'total', 'income', 'count', 'value']),
    [analysis.columnInfo]
  );

  const chartData = useMemo(() => {
    if (!dateCol || !numCol) return null;

    // Aggregate by day
    const dailyMap: Record<string, number> = {};
    filteredData.forEach(r => {
      const d = new Date(String(r[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = (dailyMap[key] || 0) + (Number(r[numCol.name]) || 0);
    });

    const sorted = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
    if (sorted.length < 4) return null;

    const values = sorted.map(([, v]) => v);
    const ma7 = computeMA(values, Math.min(7, Math.floor(sorted.length / 2)));
    const ma14 = computeMA(values, Math.min(14, Math.floor(sorted.length / 2)));

    // Split into current and previous periods
    const mid = Math.floor(sorted.length / 2);

    return sorted.map(([date, value], i) => ({
      date: date.slice(5), // MM-DD
      value: +value.toFixed(2),
      ma7: ma7[i] !== null ? +ma7[i]!.toFixed(2) : undefined,
      ma14: ma14[i] !== null ? +ma14[i]!.toFixed(2) : undefined,
      period: i < mid ? 'previous' : 'current',
      previousValue: i < mid ? +value.toFixed(2) : undefined,
      currentValue: i >= mid ? +value.toFixed(2) : undefined,
    }));
  }, [filteredData, dateCol, numCol]);

  if (!chartData) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-chart-2/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-chart-2" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">
            {numCol!.name} — Trend & Rolling Averages
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Current vs previous period with 7-day & 14-day MA
          </p>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ left: 5, right: 15, bottom: 5, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
            <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />

            {/* Actual value as area */}
            <Area
              type="monotone" dataKey="value" name="Actual"
              fill="hsl(190, 85%, 48%)" fillOpacity={0.1}
              stroke="hsl(190, 85%, 48%)" strokeWidth={1.5}
            />

            {/* 7-day MA */}
            <Line
              type="monotone" dataKey="ma7" name="7-Day MA"
              stroke="hsl(35, 90%, 55%)" strokeWidth={2}
              dot={false} strokeDasharray="0"
            />

            {/* 14-day MA */}
            <Line
              type="monotone" dataKey="ma14" name="14-Day MA"
              stroke="hsl(280, 65%, 60%)" strokeWidth={2}
              dot={false} strokeDasharray="5 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Period comparison summary */}
      <div className="flex gap-3 mt-3">
        {(() => {
          const mid = Math.floor(chartData.length / 2);
          const prevValues = chartData.slice(0, mid).map(d => d.value);
          const currValues = chartData.slice(mid).map(d => d.value);
          const prevTotal = prevValues.reduce((a, b) => a + b, 0);
          const currTotal = currValues.reduce((a, b) => a + b, 0);
          const change = prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal * 100) : 0;

          return (
            <>
              <div className="flex-1 text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Previous Period</p>
                <p className="text-sm font-semibold data-font text-foreground">{prevTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Current Period</p>
                <p className="text-sm font-semibold data-font text-foreground">{currTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className={`flex-1 text-center p-2 rounded-lg ${change >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <p className="text-xs text-muted-foreground">Change</p>
                <p className={`text-sm font-semibold data-font ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </p>
              </div>
            </>
          );
        })()}
      </div>
    </motion.div>
  );
}
