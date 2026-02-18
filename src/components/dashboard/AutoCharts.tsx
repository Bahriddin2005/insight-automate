import { useMemo } from 'react';
import { motion } from 'framer-motion';
import ChartAnnotations from './ChartAnnotations';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie,
  ScatterChart, Scatter, ZAxis, ReferenceLine, ComposedChart, Area,
  ErrorBar, Label,
} from 'recharts';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';
import { useIsMobile } from '@/hooks/use-mobile';
import ChartGestureWrapper from './ChartGestureWrapper';

// ggplot2-inspired pastel palette
const COLORS = [
  'hsl(160, 55%, 55%)', // green/teal
  'hsl(25, 75%, 65%)',  // salmon/coral
  'hsl(230, 55%, 65%)', // slate blue
  'hsl(300, 35%, 65%)', // muted purple
  'hsl(45, 75%, 60%)',  // golden
  'hsl(190, 60%, 50%)', // cyan
];

// Viridis-inspired sequential palette for heatmaps
const VIRIDIS = [
  'hsl(280, 70%, 25%)', 'hsl(260, 60%, 35%)', 'hsl(230, 50%, 40%)',
  'hsl(200, 60%, 40%)', 'hsl(175, 65%, 40%)', 'hsl(140, 60%, 45%)',
  'hsl(80, 65%, 50%)', 'hsl(55, 80%, 55%)', 'hsl(45, 90%, 60%)',
];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
    borderRadius: '6px', color: 'hsl(var(--foreground))', fontSize: '12px',
    fontFamily: '"JetBrains Mono", monospace', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
};

const axisStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: '"Space Grotesk", sans-serif' };
const gridStroke = 'hsl(var(--border))';

function createHistogram(values: number[], buckets = 12) {
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

function ChartCard({ title, children, delay = 0, chartKey, dashboardId, subtitle }: {
  title: string; children: React.ReactNode; delay?: number;
  chartKey?: string; dashboardId?: string; subtitle?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-4 sm:p-5 relative"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground/90 tracking-wide">{title}</h3>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {chartKey && dashboardId && <ChartAnnotations dashboardId={dashboardId} chartKey={chartKey} />}
      </div>
      <div className="h-52 sm:h-72">{children}</div>
    </motion.div>
  );
}

// Scatter/Dot Strip Plot — shows individual data points per category (like ggplot2 geom_jitter)
function DotStripPlot({ data, catCol, numCol }: {
  data: Record<string, unknown>[]; catCol: string; numCol: string;
}) {
  const plotData = useMemo(() => {
    const groups: Record<string, number[]> = {};
    data.forEach(row => {
      const cat = String(row[catCol] ?? '');
      const val = Number(row[numCol]);
      if (!cat || isNaN(val)) return;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(val);
    });
    const categories = Object.keys(groups).slice(0, 8);
    const points: { x: number; y: number; cat: string; jitter: number }[] = [];
    categories.forEach((cat, ci) => {
      groups[cat].forEach(v => {
        points.push({ x: ci + 1, y: v, cat, jitter: ci + 0.7 + Math.random() * 0.6 });
      });
    });
    return { points, categories };
  }, [data, catCol, numCol]);

  if (plotData.points.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis type="number" dataKey="jitter" tick={false} domain={[0.3, plotData.categories.length + 0.7]}
          axisLine={{ stroke: gridStroke }} tickLine={false}>
          <Label value="" />
        </XAxis>
        <YAxis type="number" dataKey="y" tick={axisStyle} axisLine={{ stroke: gridStroke }} />
        <Tooltip {...tooltipStyle}
          formatter={(val: number) => [val.toFixed(2), numCol]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.cat || ''}
        />
        {plotData.categories.map((cat, ci) => (
          <Scatter key={cat} name={cat}
            data={plotData.points.filter(p => p.cat === cat)}
            fill={COLORS[ci % COLORS.length]} fillOpacity={0.7}
          />
        ))}
        {/* Category labels */}
        {plotData.categories.map((cat, ci) => (
          <ReferenceLine key={`label-${ci}`} x={ci + 1} stroke="transparent"
            label={{ value: cat.length > 10 ? cat.slice(0, 10) + '…' : cat, position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// Boxplot with IQR boxes + whiskers + data points overlay
function BoxplotChart({ data, numCols }: {
  data: Record<string, unknown>[];
  numCols: { name: string; stats: NonNullable<import('@/lib/dataProcessor').ColumnInfo['stats']> }[];
}) {
  const boxData = numCols.slice(0, 6).map((col, i) => {
    const s = col.stats;
    const label = col.name.length > 10 ? col.name.slice(0, 10) + '…' : col.name;
    return {
      name: label, fullName: col.name,
      min: s.min, q1: s.q1, median: s.median, q3: s.q3, max: s.max,
      iqr: s.iqr, outliers: s.outliers,
      // Stacked bar: transparent base + colored IQR box
      base: s.q1, box: s.q3 - s.q1,
      whiskerLow: s.min, whiskerHigh: s.max,
      color: COLORS[i % COLORS.length],
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={boxData} margin={{ left: 10, right: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: gridStroke }} />
        <YAxis tick={axisStyle} axisLine={{ stroke: gridStroke }} />
        <Tooltip {...tooltipStyle}
          formatter={(_: unknown, name: string, props: { payload: typeof boxData[0] }) => {
            const d = props.payload;
            if (name === 'box') return [
              `Min: ${d.min.toFixed(1)} | Q1: ${d.q1.toFixed(1)} | Med: ${d.median.toFixed(1)} | Q3: ${d.q3.toFixed(1)} | Max: ${d.max.toFixed(1)}`,
              d.fullName
            ];
            return [null, ''];
          }}
        />
        <Bar dataKey="base" stackId="box" fill="transparent" />
        <Bar dataKey="box" stackId="box" fillOpacity={0.5} radius={[3, 3, 3, 3]}>
          {boxData.map((d, i) => <Cell key={i} fill={d.color} stroke={d.color} strokeWidth={1.5} />)}
        </Bar>
        {/* Median line as reference */}
        {boxData.map((d, i) => (
          <ReferenceLine key={`med-${i}`} y={d.median} stroke="transparent"
            label={{ value: `${d.median.toFixed(1)}`, fill: 'hsl(var(--foreground))', fontSize: 9 }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Faceted small-multiples for categorical × numeric (like ggplot2 facet_wrap)
function FacetedBarChart({ data, catCols, numCol }: {
  data: Record<string, unknown>[]; catCols: string[]; numCol: string;
}) {
  const facets = useMemo(() => {
    return catCols.slice(0, 4).map(catCol => {
      const grouped: Record<string, number[]> = {};
      data.forEach(row => {
        const cat = String(row[catCol] ?? '');
        const val = Number(row[numCol]);
        if (!cat || isNaN(val)) return;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(val);
      });
      const chartData = Object.entries(grouped)
        .map(([name, vals]) => ({
          name: name.length > 8 ? name.slice(0, 8) + '…' : name,
          mean: vals.reduce((a, b) => a + b, 0) / vals.length,
          count: vals.length,
        }))
        .sort((a, b) => b.mean - a.mean)
        .slice(0, 6);
      return { column: catCol, data: chartData };
    });
  }, [data, catCols, numCol]);

  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {facets.map((facet, fi) => (
        <div key={facet.column} className="border border-border/30 rounded-lg p-2 flex flex-col">
          <p className="text-[10px] font-semibold text-foreground/80 mb-1 text-center border-b border-border/20 pb-1">
            {facet.column}
          </p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facet.data} margin={{ left: -5, right: 5, top: 5, bottom: 15 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} />
                <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 8 }} angle={-30} textAnchor="end" axisLine={false} />
                <YAxis tick={{ ...axisStyle, fontSize: 8 }} axisLine={false} width={30} />
                <Bar dataKey="mean" radius={[3, 3, 0, 0]} fillOpacity={0.75}>
                  {facet.data.map((_, i) => (
                    <Cell key={i} fill={COLORS[fi % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
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

  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);

  // 1. Scatter Dot Strip Plot — categorical × numeric (ggplot2 geom_jitter style)
  if (catCols.length > 0 && numCols.length > 0) {
    charts.push(
      <ChartCard key="dot-strip" title={`${catCols[0].name} × ${numCols[0].name}`}
        subtitle="Scatter dot strip plot · Individual data points" delay={chartIdx++ * 0.1}>
        <DotStripPlot data={filteredData} catCol={catCols[0].name} numCol={numCols[0].name} />
      </ChartCard>
    );
  }

  // 2. Missing values (horizontal bar)
  const missingData = analysis.columnInfo
    .filter(c => c.missingCount > 0)
    .sort((a, b) => b.missingPercent - a.missingPercent)
    .slice(0, 10)
    .map(c => ({ name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name, percent: +c.missingPercent.toFixed(1) }));

  if (missingData.length > 0) {
    charts.push(
      <ChartCard key="missing" title={t('chart.missing')} subtitle="Yo'qolgan qiymatlar foizi" delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={missingData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis type="number" tick={axisStyle} axisLine={{ stroke: gridStroke }} />
            <YAxis type="category" dataKey="name" tick={axisStyle} width={80} axisLine={{ stroke: gridStroke }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
              {missingData.map((_, i) => <Cell key={i} fill={COLORS[3]} fillOpacity={0.75} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // 3. Categorical bar charts with data labels
  catCols.slice(0, 3).forEach(col => {
    const data = col.topValues!.slice(0, 8).map(v => ({
      name: v.value.length > 14 ? v.value.slice(0, 14) + '…' : v.value, count: v.count,
    }));
    charts.push(
      <ChartCard key={`cat-${col.name}`} title={`${col.name}`}
        subtitle={`${t('chart.topValues')} · n = ${col.topValues!.reduce((a, v) => a + v.count, 0)}`}
        delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 20, bottom: 40, top: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10 }} angle={-35} textAnchor="end" axisLine={{ stroke: gridStroke }} />
            <YAxis tick={axisStyle} axisLine={{ stroke: gridStroke }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.75} stroke={COLORS[i % COLORS.length]} strokeWidth={1} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  });

  // 4. Numeric distribution histograms with density-style coloring
  numCols.slice(0, 3).forEach((col, ci) => {
    const values = filteredData.map(r => Number(r[col.name])).filter(n => !isNaN(n));
    const data = createHistogram(values);
    const color = COLORS[ci % COLORS.length];
    charts.push(
      <ChartCard key={`num-${col.name}`} title={`${col.name}`}
        subtitle={`${t('chart.distribution')} · n = ${values.length}, μ = ${col.stats?.mean.toFixed(1)}`}
        delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 10, right: 20, bottom: 5, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="range" tick={{ ...axisStyle, fontSize: 9 }} axisLine={{ stroke: gridStroke }} />
            <YAxis tick={axisStyle} axisLine={{ stroke: gridStroke }} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="count" fill={color} fillOpacity={0.15} stroke="transparent" />
            <Bar dataKey="count" fill={color} fillOpacity={0.6} radius={[2, 2, 0, 0]} stroke={color} strokeWidth={1} />
            {col.stats && <ReferenceLine x={data[Math.floor(data.length / 2)]?.range} stroke={color} strokeDasharray="4 4" strokeWidth={1.5} />}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  });

  // 5. Boxplot with IQR
  const numWithStats = numCols.filter(c => c.stats).map(c => ({ name: c.name, stats: c.stats! }));
  if (numWithStats.length >= 1) {
    charts.push(
      <ChartCard key="boxplot" title="Boxplot" subtitle="IQR · Whiskers: Min–Max" delay={chartIdx++ * 0.1}>
        <BoxplotChart data={filteredData} numCols={numWithStats} />
      </ChartCard>
    );
  }

  // 6. Faceted small multiples (if multiple categoricals + numeric)
  if (catCols.length >= 2 && numCols.length > 0) {
    charts.push(
      <ChartCard key="facets" title="Faceted Comparison"
        subtitle={`${numCols[0].name} by category · Small multiples`} delay={chartIdx++ * 0.1}>
        <FacetedBarChart data={filteredData} catCols={catCols.map(c => c.name)} numCol={numCols[0].name} />
      </ChartCard>
    );
  }

  // 7. Time series
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
        <ChartCard key="ts" title={`${firstNumCol ? firstNumCol.name : t('chart.count')} — ${t('chart.overTime')}`}
          subtitle="Vaqt bo'yicha tendensiya" delay={chartIdx++ * 0.1}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={tsData} margin={{ left: 10, right: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ ...axisStyle, fontSize: 9 }} axisLine={{ stroke: gridStroke }} />
              <YAxis tick={axisStyle} axisLine={{ stroke: gridStroke }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="value" fill={COLORS[0]} fillOpacity={0.1} stroke="transparent" />
              <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3, fill: COLORS[0], stroke: 'hsl(var(--card))' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }
  }

  // 8. Donut chart
  if (catCols.length > 0 && catCols[0].topValues) {
    const pieData = catCols[0].topValues.slice(0, 6).map(v => ({ name: v.value, value: v.count }));
    charts.push(
      <ChartCard key="pie" title={`${catCols[0].name}`}
        subtitle={`${t('chart.breakdown')} · Donut`} delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius="75%" innerRadius="42%" dataKey="value" nameKey="name"
              paddingAngle={3} strokeWidth={0}
              label={({ name, percent }) => `${name.length > 8 ? name.slice(0, 8) + '…' : name} ${(percent * 100).toFixed(0)}%`}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
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
      {isMobile && <ChartGestureWrapper charts={charts} />}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">{charts}</div>
    </>
  );
}
