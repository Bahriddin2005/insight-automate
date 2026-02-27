import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieIcon, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, LineChart, Line,
  AreaChart, Area
} from 'recharts';

interface Props {
  data: any[] | null;
  columns: string[];
}

type ChartType = 'bar' | 'pie' | 'scatter' | 'line' | 'area' | 'histogram';

const COLORS = [
  'hsl(190, 85%, 48%)', 'hsl(160, 65%, 42%)', 'hsl(35, 90%, 55%)',
  'hsl(280, 65%, 60%)', 'hsl(350, 70%, 55%)', 'hsl(120, 50%, 45%)',
  'hsl(200, 70%, 50%)', 'hsl(45, 80%, 50%)',
];

export default function ProDataViz({ data, columns }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xCol, setXCol] = useState(columns[0] || '');
  const [yCol, setYCol] = useState(columns[1] || '');

  const chartData = useMemo(() => {
    if (!data || !xCol) return [];

    if (chartType === 'pie') {
      const counts: Record<string, number> = {};
      data.forEach(r => {
        const key = String(r[xCol] ?? 'null');
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));
    }

    if (chartType === 'histogram') {
      const vals = data.map(r => Number(r[xCol])).filter(v => !isNaN(v));
      if (vals.length === 0) return [];
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const binCount = 15;
      const binSize = (max - min) / binCount || 1;
      const bins = Array.from({ length: binCount }, (_, i) => ({
        name: `${(min + i * binSize).toFixed(1)}`,
        count: 0,
      }));
      vals.forEach(v => {
        const idx = Math.min(Math.floor((v - min) / binSize), binCount - 1);
        bins[idx].count++;
      });
      return bins;
    }

    return data.slice(0, 100).map(r => ({
      x: r[xCol],
      y: Number(r[yCol]) || 0,
      name: String(r[xCol]),
    }));
  }, [data, xCol, yCol, chartType]);

  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <PieIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Avval ma'lumot yuklang</p>
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = {
    background: 'hsl(225, 20%, 9%)',
    border: '1px solid hsl(220, 15%, 13%)',
    borderRadius: 8,
    color: 'hsl(210, 20%, 92%)',
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Chart turi</label>
              <Select value={chartType} onValueChange={v => setChartType(v as ChartType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                  <SelectItem value="histogram">Histogram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">X ustun</label>
              <Select value={xCol} onValueChange={setXCol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {chartType !== 'pie' && chartType !== 'histogram' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Y ustun</label>
                <Select value={yCol} onValueChange={setYCol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="y" fill="hsl(190, 85%, 48%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="y" stroke="hsl(190, 85%, 48%)" strokeWidth={2} dot={false} />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="y" stroke="hsl(190, 85%, 48%)" fill="hsl(190, 85%, 48%, 0.2)" />
                </AreaChart>
              ) : chartType === 'scatter' ? (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                  <XAxis dataKey="x" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} name={xCol} />
                  <YAxis dataKey="y" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} name={yCol} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Scatter data={chartData} fill="hsl(190, 85%, 48%)" />
                </ScatterChart>
              ) : chartType === 'histogram' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(160, 65%, 42%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
