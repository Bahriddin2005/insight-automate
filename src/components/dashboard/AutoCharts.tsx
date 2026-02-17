import { motion } from 'framer-motion';
import ChartAnnotations from './ChartAnnotations';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Legend,
  LineChart, Line, Area, AreaChart, CartesianGrid, Cell, PieChart, Pie,
  ReferenceLine,
} from 'recharts';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';
import { useIsMobile } from '@/hooks/use-mobile';
import ChartGestureWrapper from './ChartGestureWrapper';

/* Power BI Executive Metrics palette */
const COLORS = ['#4472C4', '#ED7D31', '#70AD47', '#FFC000', '#5B9BD5', '#A5A5A5'];

/** Gradient for bars - hex support */
function bar3DGradient(id: string, base: string) {
  return { id, light: base, dark: base };
}

const tooltipStyle = {
  contentStyle: {
    background: '#ffffff', border: '1px solid #e5e7eb',
    borderRadius: '4px', color: '#374151', fontSize: '12px',
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

type ChartVariant = 'missing' | 'bar' | 'histogram' | 'boxplot' | 'line' | 'pie';

function ChartCard3D({ title, children, delay = 0, chartKey, dashboardId, variant = 'bar' }: { title: string; children: React.ReactNode; delay?: number; chartKey?: string; dashboardId?: string; variant?: ChartVariant }) {
  const tiltClass = { missing: 'chart-3d-tilt-1', bar: 'chart-3d-tilt-2', histogram: 'chart-3d-tilt-3', boxplot: 'chart-3d-tilt-4', line: 'chart-3d-tilt-5', pie: 'chart-3d-tilt-6' }[variant];
  const designMap: Record<ChartVariant, string> = {
    missing: 'exec-chart-card rounded p-4 sm:p-5',
    bar: 'exec-chart-card rounded p-4 sm:p-5',
    histogram: 'exec-chart-card rounded p-4 sm:p-5',
    boxplot: 'exec-chart-card rounded p-4 sm:p-5',
    line: 'exec-chart-card rounded p-4 sm:p-5',
    pie: 'exec-chart-card rounded p-4 sm:p-5',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: -12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`chart-3d-wrapper ${tiltClass}`}
    >
      <div className={`${designMap[variant]} transition-all duration-300`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="exec-chart-title text-[11px] truncate">{title}</h3>
          {chartKey && dashboardId && <ChartAnnotations dashboardId={dashboardId} chartKey={chartKey} />}
        </div>
        <div className="h-52 sm:h-72 min-h-[200px] [transform:translateZ(20px)]">{children}</div>
      </div>
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

  const boxG = bar3DGradient('boxplot-bar', COLORS[0]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={boxData} margin={{ left: 10, right: 20, bottom: 5 }}>
        <defs>
          <linearGradient id={boxG.id} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={boxG.dark} />
            <stop offset="50%" stopColor={COLORS[0]} />
            <stop offset="100%" stopColor={boxG.light} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
        <Tooltip
          {...tooltipStyle}
          formatter={(_: unknown, name: string, props?: { payload?: typeof boxData[0] }) => {
            const d = props?.payload;
            if (!d) return [null, ''];
            if (name === 'base') return [`Min: ${d.min.toFixed(2)}`, ''];
            if (name === 'box') return [`Q1: ${d.q1.toFixed(2)} | Med: ${d.median.toFixed(2)} | Q3: ${d.q3.toFixed(2)}`, 'IQR Box'];
            return [null, ''];
          }}
        />
        <Bar dataKey="base" stackId="box" fill="transparent" />
        <Bar dataKey="box" stackId="box" fill={`url(#${boxG.id})`} radius={[6, 6, 6, 6]} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
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
    const g = bar3DGradient('missing-bar', COLORS[3]);
    charts.push(
      <ChartCard3D key="missing" title={t('chart.missing')} delay={chartIdx++ * 0.1} variant="missing">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={missingData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <defs>
              <linearGradient id={g.id} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={g.dark} />
                <stop offset="50%" stopColor={COLORS[3]} />
                <stop offset="100%" stopColor={g.light} />
              </linearGradient>
            </defs>
            <XAxis type="number" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} width={80} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="percent" radius={[0, 8, 8, 0]} fill={`url(#${g.id})`} stroke="rgba(255,255,255,0.15)" strokeWidth={1}>
              <LabelList dataKey="percent" position="right" fill="hsl(215,12%,75%)" fontSize={11} formatter={(v: number) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard3D>
    );
  }

  // Categorical
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  catCols.slice(0, 3).forEach(col => {
    const data = col.topValues!.slice(0, 8).map(v => ({
      name: v.value.length > 14 ? v.value.slice(0, 14) + '…' : v.value, count: v.count,
    }));
    charts.push(
      <ChartCard3D key={`cat-${col.name}`} title={`${col.name} — ${t('chart.topValues')}`} delay={chartIdx++ * 0.1} variant="bar">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 20, bottom: 40 }}>
            <defs>
              {COLORS.map((c, i) => {
                const safeId = `bar3d-${String(col.name).replace(/\s/g, '_')}-${i}`;
                const g = bar3DGradient(safeId, c);
                return (
                  <linearGradient key={i} id={g.id} x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor={g.dark} />
                    <stop offset="40%" stopColor={c} />
                    <stop offset="100%" stopColor={g.light} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} angle={-35} textAnchor="end" />
            <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} stroke="rgba(255,255,255,0.2)" strokeWidth={1}>
              {data.map((_, i) => <Cell key={i} fill={`url(#bar3d-${String(col.name).replace(/\s/g, '_')}-${i % COLORS.length})`} />)}
              <LabelList dataKey="count" position="top" fill="hsl(215,12%,75%)" fontSize={11} fontFamily="system-ui" stroke="none" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard3D>
    );
  });

  // Numeric histograms
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  numCols.slice(0, 3).forEach(col => {
    const values = filteredData.map(r => Number(r[col.name])).filter(n => !isNaN(n));
    const data = createHistogram(values);
    const g = bar3DGradient(`hist-${col.name}`, COLORS[0]);
    charts.push(
      <ChartCard3D key={`num-${col.name}`} title={`${col.name} — ${t('chart.distribution')}`} delay={chartIdx++ * 0.1} variant="histogram">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 20, bottom: 5 }}>
            <defs>
              <linearGradient id={g.id} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={g.dark} />
                <stop offset="50%" stopColor={COLORS[0]} />
                <stop offset="100%" stopColor={g.light} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" vertical={false} />
            <XAxis dataKey="range" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" fill={`url(#${g.id})`} radius={[8, 8, 0, 0]} stroke="rgba(255,255,255,0.15)" strokeWidth={1}>
              <LabelList dataKey="count" position="top" fill="hsl(215,12%,75%)" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard3D>
    );
  });

  // Boxplot chart for numeric columns
  const numWithStats = numCols.filter(c => c.stats).map(c => ({ name: c.name, stats: c.stats! }));
  if (numWithStats.length >= 1) {
    charts.push(
      <ChartCard3D key="boxplot" title={t('chart.boxplot') || 'Boxplot — Distribution & Outliers'} delay={chartIdx++ * 0.1} variant="boxplot">
        <BoxplotChart data={filteredData} numCols={numWithStats} />
      </ChartCard3D>
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
        <ChartCard3D key="ts" title={`${firstNumCol ? firstNumCol.name : t('chart.count')} — ${t('chart.overTime')}`} delay={chartIdx++ * 0.1} variant="line">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tsData} margin={{ left: 10, right: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="lineArea3d" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[1]} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={COLORS[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="none" fill="url(#lineArea3d)" />
              <Line type="monotone" dataKey="value" stroke={COLORS[1]} strokeWidth={3} dot={{ fill: COLORS[1], r: 4, strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6, fill: COLORS[1], stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard3D>
      );
    }
  }

  // Pie
  if (catCols.length > 0 && catCols[0].topValues) {
    const pieData = catCols[0].topValues.slice(0, 6).map((v, i) => ({ name: v.value, value: v.count, fill: COLORS[i % COLORS.length] }));
    charts.push(
      <ChartCard3D key="pie" title={`${catCols[0].name} — ${t('chart.breakdown')}`} delay={chartIdx++ * 0.1} variant="pie">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {pieData.map((d, i) => (
                <radialGradient key={i} id={`pie3d-${i}`} cx="30%" cy="30%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                  <stop offset="50%" stopColor={d.fill} />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                </radialGradient>
              ))}
            </defs>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius="65%" innerRadius="35%" dataKey="value" nameKey="name" paddingAngle={4} strokeWidth={2} stroke="#ffffff">
              {pieData.map((d, i) => <Cell key={i} fill={`url(#pie3d-${i})`} />)}
              <LabelList dataKey="name" position="outside" fill="#374151" fontSize={11} formatter={(v: string, _n: string, entry?: { value?: number; payload?: { value?: number } }) => `${v} (${entry?.value ?? entry?.payload?.value ?? ''})`} stroke="none" />
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span style={{ color: '#6b7280' }}>{v}</span>} />
            <Tooltip {...tooltipStyle} formatter={(v: number, name: string, props: { payload: { value: number } }) => [`${v} (${((v / pieData.reduce((a, d) => a + d.value, 0)) * 100).toFixed(1)}%)`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard3D>
    );
  }

  if (charts.length === 0) {
    return <div className="exec-card p-8 text-center text-[#6b7280]">{t('chart.noData')}</div>;
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
