import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, GitBranch } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { computeCohorts, detectFunnel, type CohortData, type FunnelStep } from '@/lib/intelligentKPI';
import type { DatasetAnalysis, ColumnInfo } from '@/lib/dataProcessor';

function findCol(columns: ColumnInfo[], aliases: string[]): ColumnInfo | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
  const nAliases = aliases.map(norm);
  for (const a of nAliases) {
    const f = columns.find(c => norm(c.name) === a);
    if (f) return f;
  }
  for (const a of nAliases) {
    const f = columns.find(c => norm(c.name).includes(a));
    if (f) return f;
  }
  return undefined;
}

const RETENTION_COLORS = [
  'hsl(160, 65%, 45%)', 'hsl(160, 55%, 50%)', 'hsl(45, 70%, 55%)',
  'hsl(35, 75%, 55%)', 'hsl(15, 65%, 55%)', 'hsl(0, 60%, 50%)',
];

const FUNNEL_COLORS = [
  'hsl(190, 85%, 48%)', 'hsl(190, 75%, 52%)', 'hsl(190, 65%, 56%)',
  'hsl(190, 55%, 60%)', 'hsl(190, 45%, 64%)', 'hsl(190, 35%, 68%)',
  'hsl(190, 25%, 72%)', 'hsl(190, 15%, 76%)',
];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
    borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '12px',
    fontFamily: '"JetBrains Mono", monospace',
  },
};

interface Props {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
}

export default function CohortFunnelAnalysis({ analysis, filteredData }: Props) {
  const userCol = useMemo(() =>
    findCol(analysis.columnInfo, ['user id', 'customer id', 'uid', 'user', 'client id', 'account id']),
    [analysis.columnInfo]
  );
  const dateCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'datetime'), ['date', 'timestamp', 'created at', 'time', 'order date']),
    [analysis.columnInfo]
  );

  const cohorts = useMemo(() => {
    if (!userCol || !dateCol) return null;
    const result = computeCohorts(filteredData, userCol.name, dateCol.name);
    return result.length > 1 ? result : null;
  }, [filteredData, userCol, dateCol]);

  const funnel = useMemo(() =>
    detectFunnel(filteredData, analysis.columnInfo),
    [filteredData, analysis.columnInfo]
  );

  if (!cohorts && !funnel) return null;

  return (
    <div className="space-y-4">
      {/* Cohort Retention Table */}
      {cohorts && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-chart-2/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-chart-2" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Cohort Retention Analysis</h3>
              <p className="text-[10px] text-muted-foreground">Auto-detected: {userCol!.name} × {dateCol!.name}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Cohort</th>
                  {Array.from({ length: Math.max(...cohorts.map(c => c.periods.length)) }).map((_, i) => (
                    <th key={i} className="text-center py-2 px-2 text-muted-foreground font-medium">
                      {i === 0 ? 'M0' : `M+${i}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.slice(0, 8).map((cohort) => (
                  <tr key={cohort.cohort} className="border-b border-border/20">
                    <td className="py-1.5 px-2 data-font text-foreground/80 whitespace-nowrap">{cohort.cohort}</td>
                    {cohort.periods.map((pct, pi) => {
                      const colorIdx = Math.min(Math.floor((100 - pct) / 20), RETENTION_COLORS.length - 1);
                      const bg = pi === 0 ? 'hsl(var(--primary) / 0.15)' : `${RETENTION_COLORS[Math.max(0, colorIdx)]}33`;
                      return (
                        <td key={pi} className="text-center py-1.5 px-2 data-font" style={{ backgroundColor: bg }}>
                          <span className="text-foreground/80">{pct.toFixed(0)}%</span>
                          <span className="block text-[9px] text-muted-foreground">{cohort.sizes[pi]}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Funnel Analysis */}
      {funnel && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-chart-1/20 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-chart-1" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Funnel Analysis</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis
                  type="category" dataKey="name" width={100}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, _: string, props: { payload: FunnelStep }) => [
                    `${value} (${props.payload.percent.toFixed(1)}%)${props.payload.dropoff > 0 ? ` | Drop: ${props.payload.dropoff.toFixed(1)}%` : ''}`,
                    'Count'
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Dropoff indicators */}
          <div className="flex flex-wrap gap-2 mt-3">
            {funnel.filter(s => s.dropoff > 0).map(step => (
              <span key={step.name} className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                {step.name}: -{step.dropoff.toFixed(1)}% drop
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
