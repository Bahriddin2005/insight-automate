import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart as LineChartIcon } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, ReferenceLine,
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

// Simple linear regression
function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i]; sumXY += i * values[i]; sumX2 += i * i; sumY2 += values[i] * values[i];
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssRes = values.reduce((s, v, i) => s + Math.pow(v - (slope * i + intercept), 2), 0);
  const ssTot = values.reduce((s, v) => s + Math.pow(v - yMean, 2), 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

// Simple seasonal decomposition (additive)
function seasonalDecompose(values: number[], period: number): { trend: number[]; seasonal: number[]; residual: number[] } {
  // Centered moving average for trend
  const trend: number[] = new Array(values.length).fill(NaN);
  const half = Math.floor(period / 2);
  for (let i = half; i < values.length - half; i++) {
    let sum = 0;
    for (let j = i - half; j <= i + half; j++) sum += values[j];
    trend[i] = sum / period;
  }
  // Fill edges with linear extrapolation
  for (let i = 0; i < half; i++) {
    trend[i] = trend[half] !== undefined ? trend[half] - (half - i) * ((trend[half + 1] || trend[half]) - trend[half]) : values[i];
  }
  for (let i = values.length - half; i < values.length; i++) {
    const last = values.length - half - 1;
    trend[i] = trend[last] !== undefined ? trend[last] + (i - last) * (trend[last] - (trend[last - 1] || trend[last])) : values[i];
  }

  // Seasonal component: average detrended values by period index
  const detrended = values.map((v, i) => v - (isNaN(trend[i]) ? v : trend[i]));
  const seasonalAvg: number[] = new Array(period).fill(0);
  const seasonalCount: number[] = new Array(period).fill(0);
  detrended.forEach((d, i) => {
    if (!isNaN(d)) { seasonalAvg[i % period] += d; seasonalCount[i % period]++; }
  });
  for (let i = 0; i < period; i++) seasonalAvg[i] = seasonalCount[i] > 0 ? seasonalAvg[i] / seasonalCount[i] : 0;

  const seasonal = values.map((_, i) => seasonalAvg[i % period]);
  const residual = values.map((v, i) => v - (isNaN(trend[i]) ? v : trend[i]) - seasonal[i]);

  return { trend: trend.map(t => isNaN(t) ? 0 : t), seasonal, residual };
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

export default function PredictiveForecasting({ analysis, filteredData }: Props) {
  const dateCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'datetime'), ['date', 'timestamp', 'created at', 'time', 'order date']),
    [analysis.columnInfo]
  );
  const numCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'numeric'), ['revenue', 'sales', 'amount', 'total', 'income', 'count', 'value']),
    [analysis.columnInfo]
  );

  const forecastData = useMemo(() => {
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
    if (sorted.length < 7) return null;

    const values = sorted.map(([, v]) => v);
    const reg = linearRegression(values);
    const period = Math.min(7, Math.floor(values.length / 3));
    const { trend, seasonal } = seasonalDecompose(values, period);

    // Forecast 7 periods ahead
    const forecastPeriods = Math.min(7, Math.ceil(sorted.length * 0.3));
    const forecastStart = sorted.length;

    const allData = sorted.map(([date, value], i) => ({
      date: date.slice(5),
      actual: +value.toFixed(2),
      trend: +trend[i].toFixed(2),
      regression: +(reg.slope * i + reg.intercept).toFixed(2),
      forecast: undefined as number | undefined,
      forecastUpper: undefined as number | undefined,
      forecastLower: undefined as number | undefined,
    }));

    // Add forecast points
    const residualStd = Math.sqrt(values.reduce((s, v, i) => s + Math.pow(v - trend[i] - seasonal[i], 2), 0) / values.length);
    const lastDate = new Date(sorted[sorted.length - 1][0]);

    for (let i = 0; i < forecastPeriods; i++) {
      const idx = forecastStart + i;
      const trendVal = reg.slope * idx + reg.intercept;
      const seasonalVal = seasonal[(forecastStart + i) % period];
      const forecast = trendVal + seasonalVal;
      const confidence = residualStd * (1 + i * 0.15); // Widening confidence

      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i + 1);

      allData.push({
        date: `${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`,
        actual: undefined as unknown as number,
        trend: +(trendVal).toFixed(2),
        regression: +(reg.slope * idx + reg.intercept).toFixed(2),
        forecast: +forecast.toFixed(2),
        forecastUpper: +(forecast + 1.96 * confidence).toFixed(2),
        forecastLower: +Math.max(0, forecast - 1.96 * confidence).toFixed(2),
      });
    }

    return { data: allData, r2: reg.r2, slope: reg.slope, forecastStart: sorted.length };
  }, [filteredData, dateCol, numCol]);

  if (!forecastData) return null;

  const trendDirection = forecastData.slope >= 0 ? 'Upward' : 'Downward';
  const trendColor = forecastData.slope >= 0 ? 'text-success' : 'text-destructive';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-chart-5/20 flex items-center justify-center">
            <LineChartIcon className="w-4 h-4 text-chart-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">{numCol!.name} — Predictive Forecast</h3>
            <p className="text-[10px] text-muted-foreground">Linear regression + seasonal decomposition</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium ${trendColor}`}>{trendDirection} trend</span>
          <span className="text-[10px] text-muted-foreground data-font">R² = {forecastData.r2.toFixed(3)}</span>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={forecastData.data} margin={{ left: 5, right: 15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
            <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />

            {/* Confidence interval */}
            <Area type="monotone" dataKey="forecastUpper" name="Upper CI" stroke="none" fill="hsl(280, 65%, 60%)" fillOpacity={0.08} />
            <Area type="monotone" dataKey="forecastLower" name="Lower CI" stroke="none" fill="hsl(280, 65%, 60%)" fillOpacity={0.08} />

            {/* Actual data */}
            <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(190, 85%, 48%)" strokeWidth={2} dot={false} connectNulls={false} />

            {/* Trend line */}
            <Line type="monotone" dataKey="trend" name="Trend" stroke="hsl(35, 90%, 55%)" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />

            {/* Forecast */}
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(280, 65%, 60%)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />

            {/* Separator line */}
            <ReferenceLine x={forecastData.data[forecastData.forecastStart - 1]?.date} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: 'Forecast →', position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Model Fit (R²)</p>
          <p className={`text-sm font-semibold data-font ${forecastData.r2 >= 0.7 ? 'text-success' : forecastData.r2 >= 0.4 ? 'text-chart-3' : 'text-destructive'}`}>
            {(forecastData.r2 * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex-1 text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Daily Trend</p>
          <p className={`text-sm font-semibold data-font ${trendColor}`}>
            {forecastData.slope >= 0 ? '+' : ''}{forecastData.slope.toFixed(2)}/day
          </p>
        </div>
        <div className="flex-1 text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Forecast Points</p>
          <p className="text-sm font-semibold data-font text-foreground">{forecastData.data.length - forecastData.forecastStart}</p>
        </div>
      </div>
    </motion.div>
  );
}
