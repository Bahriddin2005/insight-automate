import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, UserX, UserCheck, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
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

export interface ChurnUser {
  userId: string;
  daysSinceLastActivity: number;
  totalEvents: number;
  avgFrequency: number; // events per active day
  churnProbability: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

function computeChurnRisk(
  data: Record<string, unknown>[],
  userCol: string,
  dateCol: string,
): ChurnUser[] {
  const now = new Date();
  const userActivity: Record<string, Date[]> = {};

  data.forEach(r => {
    const uid = String(r[userCol] ?? '');
    const d = new Date(String(r[dateCol]));
    if (!uid || isNaN(d.getTime())) return;
    if (!userActivity[uid]) userActivity[uid] = [];
    userActivity[uid].push(d);
  });

  // Find latest date in dataset as reference point
  let maxDate = new Date(0);
  Object.values(userActivity).forEach(dates => {
    dates.forEach(d => { if (d > maxDate) maxDate = d; });
  });
  const refDate = maxDate > new Date(2000, 0) ? maxDate : now;

  return Object.entries(userActivity).map(([userId, dates]) => {
    dates.sort((a, b) => a.getTime() - b.getTime());
    const lastActivity = dates[dates.length - 1];
    const daysSinceLastActivity = Math.floor((refDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    const totalEvents = dates.length;

    // Unique active days
    const uniqueDays = new Set(dates.map(d => d.toISOString().split('T')[0])).size;
    const avgFrequency = uniqueDays > 0 ? totalEvents / uniqueDays : 0;

    // Date span
    const spanDays = Math.max(1, Math.floor((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)));

    // Churn probability based on recency, frequency, and engagement span
    const recencyScore = Math.min(daysSinceLastActivity / 30, 1) * 50; // 0-50
    const frequencyScore = Math.max(0, 1 - (avgFrequency / 5)) * 25; // 0-25
    const spanScore = Math.max(0, 1 - (spanDays / 90)) * 25; // 0-25
    const churnProbability = Math.min(100, Math.round(recencyScore + frequencyScore + spanScore));

    const riskLevel: ChurnUser['riskLevel'] =
      churnProbability >= 75 ? 'critical' :
      churnProbability >= 50 ? 'high' :
      churnProbability >= 25 ? 'medium' : 'low';

    return { userId, daysSinceLastActivity, totalEvents, avgFrequency, churnProbability, riskLevel };
  });
}

const riskColors = {
  critical: 'hsl(0, 70%, 50%)',
  high: 'hsl(25, 80%, 55%)',
  medium: 'hsl(45, 75%, 50%)',
  low: 'hsl(160, 60%, 45%)',
};

const riskBgColors = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
};

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

export default function ChurnRiskPanel({ analysis, filteredData }: Props) {
  const userCol = useMemo(() =>
    findCol(analysis.columnInfo, ['user id', 'customer id', 'uid', 'user', 'client id', 'account id']),
    [analysis.columnInfo]
  );
  const dateCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'datetime'), ['date', 'timestamp', 'created at', 'time', 'order date']),
    [analysis.columnInfo]
  );

  const churnData = useMemo(() => {
    if (!userCol || !dateCol) return null;
    const users = computeChurnRisk(filteredData, userCol.name, dateCol.name);
    return users.length > 1 ? users : null;
  }, [filteredData, userCol, dateCol]);

  if (!churnData) return null;

  const riskDistribution = [
    { level: 'Critical', count: churnData.filter(u => u.riskLevel === 'critical').length, color: riskColors.critical },
    { level: 'High', count: churnData.filter(u => u.riskLevel === 'high').length, color: riskColors.high },
    { level: 'Medium', count: churnData.filter(u => u.riskLevel === 'medium').length, color: riskColors.medium },
    { level: 'Low', count: churnData.filter(u => u.riskLevel === 'low').length, color: riskColors.low },
  ];

  const avgChurn = Math.round(churnData.reduce((s, u) => s + u.churnProbability, 0) / churnData.length);
  const atRisk = churnData.filter(u => u.churnProbability >= 50).length;
  const topAtRisk = churnData.sort((a, b) => b.churnProbability - a.churnProbability).slice(0, 8);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
          <UserX className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">Churn Risk Analysis</h3>
          <p className="text-[10px] text-muted-foreground">Auto-detected: {userCol!.name} × {dateCol!.name}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <p className="text-lg font-semibold data-font text-foreground">{churnData.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Users</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-destructive/10">
          <p className="text-lg font-semibold data-font text-destructive">{atRisk}</p>
          <p className="text-[10px] text-muted-foreground">At Risk (≥50%)</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <p className="text-lg font-semibold data-font text-foreground">{avgChurn}%</p>
          <p className="text-[10px] text-muted-foreground">Avg Churn Prob</p>
        </div>
      </div>

      {/* Risk distribution chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={riskDistribution} margin={{ left: 5, right: 15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
            <XAxis dataKey="level" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {riskDistribution.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top at-risk users */}
      <div>
        <h4 className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Top At-Risk Users</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {topAtRisk.map(user => (
            <div key={user.userId} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                {user.riskLevel === 'critical' || user.riskLevel === 'high' ?
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" /> :
                  <UserCheck className="w-3.5 h-3.5 text-success shrink-0" />
                }
                <span className="text-xs data-font text-foreground/80 truncate">{user.userId}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />{user.daysSinceLastActivity}d ago
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${riskBgColors[user.riskLevel]}`}>
                  {user.churnProbability}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
