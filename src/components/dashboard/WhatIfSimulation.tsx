import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
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

export default function WhatIfSimulation({ analysis, filteredData }: Props) {
  const revenueCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'numeric'), ['revenue', 'sales', 'amount', 'total', 'income']),
    [analysis.columnInfo]
  );
  const costCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'numeric'), ['cost', 'expense', 'spend', 'cogs']),
    [analysis.columnInfo]
  );
  const dateCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'datetime'), ['date', 'timestamp', 'created at', 'time']),
    [analysis.columnInfo]
  );

  const [revenueChange, setRevenueChange] = useState(0);
  const [costChange, setCostChange] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  const baseMetrics = useMemo(() => {
    if (!revenueCol) return null;
    const totalRevenue = filteredData.reduce((s, r) => s + (Number(r[revenueCol.name]) || 0), 0);
    const totalCost = costCol ? filteredData.reduce((s, r) => s + (Number(r[costCol.name]) || 0), 0) : 0;
    return { totalRevenue, totalCost };
  }, [filteredData, revenueCol, costCol]);

  const projectionData = useMemo(() => {
    if (!baseMetrics || !revenueCol) return null;

    const { totalRevenue, totalCost } = baseMetrics;
    const adjRevenue = totalRevenue * (1 + revenueChange / 100);
    const adjCost = totalCost * (1 + costChange / 100);

    // Project 6 periods forward
    const periods: { period: string; revenue: number; cost: number; profit: number; baseline: number }[] = [];
    for (let i = 0; i <= 6; i++) {
      const growthMultiplier = Math.pow(1 + growthRate / 100, i);
      const projRevenue = adjRevenue * growthMultiplier;
      const projCost = adjCost * Math.pow(1 + (growthRate * 0.6) / 100, i); // costs grow slower
      periods.push({
        period: i === 0 ? 'Now' : `+${i}`,
        revenue: Math.round(projRevenue),
        cost: Math.round(projCost),
        profit: Math.round(projRevenue - projCost),
        baseline: Math.round(totalRevenue * Math.pow(1, i)), // flat baseline
      });
    }
    return periods;
  }, [baseMetrics, revenueChange, costChange, growthRate, revenueCol]);

  if (!baseMetrics || !revenueCol) return null;

  const reset = () => { setRevenueChange(0); setCostChange(0); setGrowthRate(0); };
  const adjRevenue = baseMetrics.totalRevenue * (1 + revenueChange / 100);
  const adjCost = baseMetrics.totalCost * (1 + costChange / 100);
  const adjProfit = adjRevenue - adjCost;
  const adjMargin = adjRevenue > 0 ? (adjProfit / adjRevenue * 100) : 0;

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-chart-4/20 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-chart-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">What-If Simulation</h3>
            <p className="text-[10px] text-muted-foreground">Adjust variables to see projected impact</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="text-xs gap-1">
          <RotateCcw className="w-3 h-3" /> Reset
        </Button>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Revenue Change</span>
            <span className={`data-font font-medium ${revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
              {revenueChange >= 0 ? '+' : ''}{revenueChange}%
            </span>
          </div>
          <Slider value={[revenueChange]} onValueChange={v => setRevenueChange(v[0])} min={-50} max={100} step={5} className="w-full" />
        </div>
        {costCol && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Cost Change</span>
              <span className={`data-font font-medium ${costChange <= 0 ? 'text-success' : 'text-destructive'}`}>
                {costChange >= 0 ? '+' : ''}{costChange}%
              </span>
            </div>
            <Slider value={[costChange]} onValueChange={v => setCostChange(v[0])} min={-50} max={100} step={5} className="w-full" />
          </div>
        )}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Growth Rate / Period</span>
            <span className="data-font font-medium text-chart-2">{growthRate >= 0 ? '+' : ''}{growthRate}%</span>
          </div>
          <Slider value={[growthRate]} onValueChange={v => setGrowthRate(v[0])} min={-20} max={50} step={1} className="w-full" />
        </div>
      </div>

      {/* Impact KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Adj. Revenue</p>
          <p className="text-sm font-semibold data-font text-foreground">{fmt(adjRevenue)}</p>
        </div>
        {costCol && (
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Adj. Cost</p>
            <p className="text-sm font-semibold data-font text-foreground">{fmt(adjCost)}</p>
          </div>
        )}
        <div className={`text-center p-2 rounded-lg ${adjProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
          <p className="text-[10px] text-muted-foreground">Profit</p>
          <p className={`text-sm font-semibold data-font ${adjProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(adjProfit)}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Margin</p>
          <p className="text-sm font-semibold data-font text-foreground">{adjMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Projection chart */}
      {projectionData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData} margin={{ left: 5, right: 15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
              <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(190, 85%, 48%)" strokeWidth={2} dot={{ r: 3 }} />
              {costCol && <Line type="monotone" dataKey="cost" name="Cost" stroke="hsl(350, 70%, 55%)" strokeWidth={2} dot={{ r: 3 }} />}
              <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(160, 65%, 42%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="baseline" name="Baseline" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
