import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart3, AlertTriangle, TrendingUp, Hash, Calendar, Type, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, PieChart, Pie
} from 'recharts';

interface Props {
  data: any[] | null;
  columns: string[];
  fileName: string;
}

export default function ProDataEDA({ data, columns, fileName }: Props) {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const numericCols = columns.filter(col => {
      const vals = data.slice(0, 100).map(r => r[col]).filter(v => v != null);
      return vals.length > 0 && vals.every(v => !isNaN(Number(v)));
    });

    const missingByCol = columns.map(col => {
      const missing = data.filter(r => r[col] == null || r[col] === '').length;
      return { col, missing, pct: Math.round((missing / data.length) * 100) };
    });

    const numericStats = numericCols.map(col => {
      const vals = data.map(r => Number(r[col])).filter(v => !isNaN(v)).sort((a, b) => a - b);
      const n = vals.length;
      const mean = vals.reduce((s, v) => s + v, 0) / n;
      const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
      const q1 = vals[Math.floor(n * 0.25)];
      const median = vals[Math.floor(n * 0.5)];
      const q3 = vals[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const outliers = vals.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;
      return { col, mean, std, min: vals[0], max: vals[n - 1], q1, median, q3, outliers };
    });

    // Correlation matrix (simplified — Pearson for numeric pairs)
    const correlations: { x: string; y: string; r: number }[] = [];
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const xVals = data.map(r => Number(r[numericCols[i]]));
        const yVals = data.map(r => Number(r[numericCols[j]]));
        const n = xVals.length;
        const xMean = xVals.reduce((s, v) => s + v, 0) / n;
        const yMean = yVals.reduce((s, v) => s + v, 0) / n;
        let num = 0, dx = 0, dy = 0;
        for (let k = 0; k < n; k++) {
          num += (xVals[k] - xMean) * (yVals[k] - yMean);
          dx += (xVals[k] - xMean) ** 2;
          dy += (yVals[k] - yMean) ** 2;
        }
        const r = dx && dy ? num / Math.sqrt(dx * dy) : 0;
        correlations.push({ x: numericCols[i], y: numericCols[j], r: Math.round(r * 100) / 100 });
      }
    }

    const totalMissing = missingByCol.reduce((s, c) => s + c.missing, 0);
    const totalCells = data.length * columns.length;
    const qualityScore = Math.round((1 - totalMissing / totalCells) * 100);

    return { numericCols, missingByCol, numericStats, correlations, qualityScore, totalMissing, totalCells };
  }, [data, columns]);

  if (!data || !stats) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Avval ma'lumot yuklang</p>
          <p className="text-sm mt-1">EDA avtomatik ravishda ishga tushadi</p>
        </CardContent>
      </Card>
    );
  }

  const distributionData = stats.numericStats.slice(0, 6).map(s => ({
    name: s.col.length > 12 ? s.col.slice(0, 12) + '…' : s.col,
    mean: Math.round(s.mean * 100) / 100,
    median: Math.round(s.median * 100) / 100,
  }));

  const missingChart = stats.missingByCol.filter(c => c.pct > 0).slice(0, 10).map(c => ({
    name: c.col.length > 15 ? c.col.slice(0, 15) + '…' : c.col,
    pct: c.pct,
  }));

  const COLORS = [
    'hsl(190, 85%, 48%)', 'hsl(160, 65%, 42%)', 'hsl(35, 90%, 55%)',
    'hsl(280, 65%, 60%)', 'hsl(350, 70%, 55%)', 'hsl(120, 50%, 45%)',
  ];

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Quality Score', value: `${stats.qualityScore}%`, icon: TrendingUp, color: stats.qualityScore > 80 ? 'text-accent' : 'text-warning' },
          { label: 'Rows', value: data.length.toLocaleString(), icon: Hash, color: 'text-primary' },
          { label: 'Columns', value: columns.length.toString(), icon: Type, color: 'text-primary' },
          { label: 'Missing Cells', value: stats.totalMissing.toLocaleString(), icon: AlertTriangle, color: stats.totalMissing > 0 ? 'text-destructive' : 'text-accent' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Missing Values Chart */}
      {missingChart.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Missing Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missingChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} width={120} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, color: 'hsl(210, 20%, 92%)' }}
                    formatter={(val: number) => [`${val}%`, 'Missing']}
                  />
                  <Bar dataKey="pct" fill="hsl(35, 90%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Numeric Stats Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            Statistical Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {['Column', 'Mean', 'Std', 'Min', 'Q1', 'Median', 'Q3', 'Max', 'Outliers'].map(h => (
                  <th key={h} className="py-2 px-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.numericStats.map(s => (
                <tr key={s.col} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-2 px-3 font-medium text-foreground whitespace-nowrap">{s.col}</td>
                  <td className="py-2 px-3 data-font text-foreground">{s.mean.toFixed(2)}</td>
                  <td className="py-2 px-3 data-font text-foreground">{s.std.toFixed(2)}</td>
                  <td className="py-2 px-3 data-font text-foreground">{s.min}</td>
                  <td className="py-2 px-3 data-font text-foreground">{s.q1}</td>
                  <td className="py-2 px-3 data-font text-primary">{s.median}</td>
                  <td className="py-2 px-3 data-font text-foreground">{s.q3}</td>
                  <td className="py-2 px-3 data-font text-foreground">{s.max}</td>
                  <td className="py-2 px-3">
                    {s.outliers > 0 ? (
                      <Badge variant="destructive" className="text-xs">{s.outliers}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">0</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Distribution Chart */}
      {distributionData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mean vs Median</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, color: 'hsl(210, 20%, 92%)' }} />
                  <Bar dataKey="mean" fill="hsl(190, 85%, 48%)" radius={[4, 4, 0, 0]} name="Mean" />
                  <Bar dataKey="median" fill="hsl(160, 65%, 42%)" radius={[4, 4, 0, 0]} name="Median" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Correlation Heatmap (top pairs) */}
      {stats.correlations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Korrelyatsiyalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {stats.correlations
                .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
                .slice(0, 8)
                .map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-40 truncate">{c.x} ↔ {c.y}</span>
                    <Progress value={Math.abs(c.r) * 100} className="flex-1 h-2" />
                    <span className={`text-xs font-mono font-medium w-12 text-right ${
                      Math.abs(c.r) > 0.7 ? 'text-primary' : Math.abs(c.r) > 0.4 ? 'text-warning' : 'text-muted-foreground'
                    }`}>
                      {c.r.toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
