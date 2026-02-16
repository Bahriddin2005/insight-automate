import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie,
} from 'recharts';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

const COLORS = [
  'hsl(190, 85%, 48%)', 'hsl(160, 65%, 42%)', 'hsl(35, 90%, 55%)',
  'hsl(280, 65%, 60%)', 'hsl(350, 70%, 55%)', 'hsl(210, 70%, 55%)',
];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(225, 20%, 9%)',
    border: '1px solid hsl(220, 15%, 16%)',
    borderRadius: '8px',
    color: 'hsl(210, 20%, 92%)',
    fontSize: '13px',
    fontFamily: '"JetBrains Mono", monospace',
  },
};

function createHistogram(values: number[], buckets = 10) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const size = (max - min) / buckets || 1;
  const result = Array.from({ length: buckets }, (_, i) => ({
    range: (min + i * size).toFixed(max > 100 ? 0 : 1),
    count: 0,
  }));
  values.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / size), buckets - 1);
    result[idx].count++;
  });
  return result;
}

function ChartCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{title}</h3>
      <div className="h-64">{children}</div>
    </motion.div>
  );
}

interface AutoChartsProps {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
}

export default function AutoCharts({ analysis, filteredData }: AutoChartsProps) {
  const charts: React.ReactNode[] = [];
  let chartIdx = 0;

  // Missing values overview
  const missingData = analysis.columnInfo
    .filter(c => c.missingCount > 0)
    .sort((a, b) => b.missingPercent - a.missingPercent)
    .slice(0, 10)
    .map(c => ({ name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name, percent: +c.missingPercent.toFixed(1) }));

  if (missingData.length > 0) {
    charts.push(
      <ChartCard key="missing" title="Missing Values (%)" delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={missingData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} width={80} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
              {missingData.map((_, i) => <Cell key={i} fill={COLORS[3]} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // Categorical columns - top values
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  catCols.slice(0, 3).forEach(col => {
    const data = col.topValues!.slice(0, 8).map(v => ({
      name: v.value.length > 14 ? v.value.slice(0, 14) + '…' : v.value,
      count: v.count,
    }));
    charts.push(
      <ChartCard key={`cat-${col.name}`} title={`${col.name} — Top Values`} delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} angle={-35} textAnchor="end" />
            <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  });

  // Numeric columns - histogram
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  numCols.slice(0, 3).forEach(col => {
    const values = filteredData.map(r => Number(r[col.name])).filter(n => !isNaN(n));
    const data = createHistogram(values);
    charts.push(
      <ChartCard key={`num-${col.name}`} title={`${col.name} — Distribution`} delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
            <XAxis dataKey="range" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} fillOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  });

  // Time series
  const dateCol = analysis.columnInfo.find(c => c.type === 'datetime');
  if (dateCol) {
    const firstNumCol = numCols[0];
    const grouped: Record<string, number> = {};
    filteredData.forEach(row => {
      const d = new Date(String(row[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      if (firstNumCol) {
        grouped[key] = (grouped[key] || 0) + Number(row[firstNumCol.name] || 0);
      } else {
        grouped[key] = (grouped[key] || 0) + 1;
      }
    });
    const tsData = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value: +value.toFixed(2) }));

    if (tsData.length > 1) {
      charts.push(
        <ChartCard
          key="timeseries"
          title={`${firstNumCol ? firstNumCol.name : 'Count'} Over Time`}
          delay={chartIdx++ * 0.1}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tsData} margin={{ left: 10, right: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke={COLORS[1]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }
  }

  // Pie chart for first categorical column
  if (catCols.length > 0 && catCols[0].topValues) {
    const pieData = catCols[0].topValues.slice(0, 6).map(v => ({ name: v.value, value: v.count }));
    charts.push(
      <ChartCard key="pie" title={`${catCols[0].name} — Breakdown`} delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%" cy="50%"
              outerRadius="75%"
              innerRadius="45%"
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              strokeWidth={0}
            >
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        No suitable columns detected for chart generation.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {charts}
    </div>
  );
}
