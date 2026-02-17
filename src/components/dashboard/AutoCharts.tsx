import { motion } from 'framer-motion';
import ChartAnnotations from './ChartAnnotations';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';
import { useIsMobile } from '@/hooks/use-mobile';
import ChartGestureWrapper from './ChartGestureWrapper';

const COLORS = [
  'hsl(190, 85%, 48%)', 'hsl(160, 65%, 42%)', 'hsl(35, 90%, 55%)',
  'hsl(280, 65%, 60%)', 'hsl(350, 70%, 55%)', 'hsl(210, 70%, 55%)',
];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 16%)',
    borderRadius: '8px', color: 'hsl(210, 20%, 92%)', fontSize: '13px',
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

function ChartCard({ title, children, delay = 0, chartKey, dashboardId }: { title: string; children: React.ReactNode; delay?: number; chartKey?: string; dashboardId?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }} className="glass-card p-3 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</h3>
        {chartKey && dashboardId && <ChartAnnotations dashboardId={dashboardId} chartKey={chartKey} />}
      </div>
      <div className="h-48 sm:h-64">{children}</div>
    </motion.div>
  );
}

// Boxplot component using bar chart simulation
function BoxplotChart({ data, numCols }: { data: Record<string, unknown>[]; numCols: { name: string; stats: NonNullable<import('@/lib/dataProcessor').ColumnInfo['stats']> }[] }) {
  const boxData = numCols.slice(0, 6).map(col => {
    const s = col.stats;
    return {
      name: col.name.length > 10 ? col.name.slice(0, 10) + '…' : col.name,
      min: s.min,
      q1: s.q1,
      median: s.median,
      q3: s.q3,
      max: s.max,
      iqr: s.iqr,
      outliers: s.outliers,
      // For stacked bar simulation
      base: s.q1,
      box: s.q3 - s.q1,
      whiskerLow: s.q1 - s.min,
      whiskerHigh: s.max - s.q3,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={boxData} margin={{ left: 10, right: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
        <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
        <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
        <Tooltip
          {...tooltipStyle}
          formatter={(_: unknown, name: string, props: { payload: typeof boxData[0] }) => {
            const d = props.payload;
            if (name === 'base') return [`Min: ${d.min.toFixed(2)}`, ''];
            if (name === 'box') return [`Q1: ${d.q1.toFixed(2)} | Med: ${d.median.toFixed(2)} | Q3: ${d.q3.toFixed(2)}`, 'IQR Box'];
            return [null, ''];
          }}
        />
        <Bar dataKey="base" stackId="box" fill="transparent" />
        <Bar dataKey="box" stackId="box" fill={COLORS[0]} fillOpacity={0.7} radius={[4, 4, 4, 4]} />
        <ReferenceLine y={0} stroke="transparent" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface AutoChartsProps {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
}

export default function AutoCharts({ analysis, filteredData }: AutoChartsProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const charts: React.ReactNode[] = [];
  let chartIdx = 0;

  // Missing values
  const missingData = analysis.columnInfo
    .filter(c => c.missingCount > 0)
    .sort((a, b) => b.missingPercent - a.missingPercent)
    .slice(0, 10)
    .map(c => ({ name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name, percent: +c.missingPercent.toFixed(1) }));

  if (missingData.length > 0) {
    charts.push(
      <ChartCard key="missing" title={t('chart.missing')} delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={missingData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} width={80} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="percent" radius={[0, 4, 4, 0]}>{missingData.map((_, i) => <Cell key={i} fill={COLORS[3]} fillOpacity={0.8} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // Categorical
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  catCols.slice(0, 3).forEach(col => {
    const data = col.topValues!.slice(0, 8).map(v => ({
      name: v.value.length > 14 ? v.value.slice(0, 14) + '…' : v.value, count: v.count,
    }));
    charts.push(
      <ChartCard key={`cat-${col.name}`} title={`${col.name} — ${t('chart.topValues')}`} delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} angle={-35} textAnchor="end" />
            <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  });

  // Numeric histograms
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  numCols.slice(0, 3).forEach(col => {
    const values = filteredData.map(r => Number(r[col.name])).filter(n => !isNaN(n));
    const data = createHistogram(values);
    charts.push(
      <ChartCard key={`num-${col.name}`} title={`${col.name} — ${t('chart.distribution')}`} delay={chartIdx++ * 0.1}>
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

  // Boxplot chart for numeric columns
  const numWithStats = numCols.filter(c => c.stats).map(c => ({ name: c.name, stats: c.stats! }));
  if (numWithStats.length >= 1) {
    charts.push(
      <ChartCard key="boxplot" title={t('chart.boxplot') || 'Boxplot — Distribution & Outliers'} delay={chartIdx++ * 0.1}>
        <BoxplotChart data={filteredData} numCols={numWithStats} />
      </ChartCard>
    );
  }

  // Time series
  const dateCol = analysis.columnInfo.find(c => c.type === 'datetime');
  if (dateCol) {
    const firstNumCol = numCols[0];
    const grouped: Record<string, number> = {};
    filteredData.forEach(row => {
      const d = new Date(String(row[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      grouped[key] = (grouped[key] || 0) + (firstNumCol ? Number(row[firstNumCol.name] || 0) : 1);
    });
    const tsData = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value: +value.toFixed(2) }));
    if (tsData.length > 1) {
      charts.push(
        <ChartCard key="ts" title={`${firstNumCol ? firstNumCol.name : t('chart.count')} — ${t('chart.overTime')}`} delay={chartIdx++ * 0.1}>
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

  // Pie
  if (catCols.length > 0 && catCols[0].topValues) {
    const pieData = catCols[0].topValues.slice(0, 6).map(v => ({ name: v.value, value: v.count }));
    charts.push(
      <ChartCard key="pie" title={`${catCols[0].name} — ${t('chart.breakdown')}`} delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius="75%" innerRadius="45%" dataKey="value" nameKey="name" paddingAngle={2} strokeWidth={0}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (charts.length === 0) {
    return <div className="glass-card p-8 text-center text-muted-foreground">{t('chart.noData')}</div>;
  }

  return (
    <>
      {/* Mobile: swipeable carousel with pinch-to-zoom */}
      {isMobile && <ChartGestureWrapper charts={charts} />}
      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">{charts}</div>
    </>
  );
}
