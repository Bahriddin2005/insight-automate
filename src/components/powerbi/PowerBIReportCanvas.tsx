/**
 * Power BI Report Canvas — Dark Luxury Executive BI
 * FinTech premium: KPI row | Hero trend | 50/50 Category+Regional | 50/50 Waterfall+Funnel | Bottom ops chart
 */

import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LabelList,
} from 'recharts';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import type { PowerBiDataModel, PbiMeasure, PbiColumn } from '@/lib/powerBiModel';
import type { FilterContext } from '@/lib/powerBiCalculations';
import { sumFiltered, distinctCountFiltered, momGrowth } from '@/lib/powerBiCalculations';
import { formatExecutive } from '@/lib/formatNumber';
import PowerBIKPICard from './PowerBIKPICard';
import PowerBIWaterfall from './PowerBIWaterfall';
import PowerBIFunnel from './PowerBIFunnel';

const DLUX = {
  primary: '#00D4FF',
  secondary: '#14F195',
  gold: '#C8A24D',
  negative: '#FF4D4F',
  text: '#E5E7EB',
  textMuted: '#9CA3AF',
  grid: 'rgba(255,255,255,0.06)',
  palette: ['#00D4FF', '#14F195', '#C8A24D', '#0EA5E9', '#9CA3AF'],
};

const TOOLTIP_STYLE = {
  background: '#111827',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  borderRadius: 8,
  fontSize: 11,
  color: '#E5E7EB',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(0, 212, 255, 0.08)',
};

interface Props {
  analysis: DatasetAnalysis;
  model: PowerBiDataModel;
  measures: PbiMeasure[];
  data: Record<string, unknown>[];
  filters: FilterContext;
  onFilterChange: (f: FilterContext) => void;
  visualConfig: Record<string, unknown>;
  selectedVisual: string | null;
  onSelectVisual: (id: string | null) => void;
  slicerColumns?: string[];
  boardMode?: boolean;
}

function buildWaterfallData(
  data: Record<string, unknown>[],
  valueCol: string,
  dateCol: string
): { name: string; value: number; type: 'start' | 'increase' | 'decrease' | 'end' }[] {
  const byMonth: Record<string, number> = {};
  data.forEach(row => {
    const d = new Date(String(row[dateCol]));
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + (Number(row[valueCol]) || 0);
  });
  const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length < 2) return [];

  const prev = sorted[sorted.length - 2][1];
  const curr = sorted[sorted.length - 1][1];
  const delta = curr - prev;
  return [
    { name: sorted[sorted.length - 2][0], value: prev, type: 'start' },
    { name: delta >= 0 ? 'Increase' : 'Decrease', value: Math.abs(delta), type: delta >= 0 ? 'increase' : 'decrease' },
    { name: sorted[sorted.length - 1][0], value: curr, type: 'end' },
  ];
}

function buildFunnelData(
  data: Record<string, unknown>[],
  catCol: PbiColumn,
  valueCol: PbiColumn
): { name: string; value: number }[] {
  const byCat: Record<string, number> = {};
  data.forEach(row => {
    const k = String(row[catCol.name] ?? '');
    byCat[k] = (byCat[k] || 0) + (Number(row[valueCol.name]) || 0);
  });
  return Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));
}

export default function PowerBIReportCanvas({
  analysis, model, measures, data, filters, onFilterChange, selectedVisual, onSelectVisual,
  boardMode = false,
}: Props) {
  const factTable = model?.tables?.find(t => t.role === 'fact') ?? model?.tables?.[0];
  if (!factTable) {
    return (
      <div className="p-6 min-h-full flex items-center justify-center">
        <p className="text-sm text-[#9CA3AF]">Model loading...</p>
      </div>
    );
  }

  const numCols = factTable.columns?.filter(c => c.type === 'numeric' && c.role === 'measure') ?? [];
  const catCols = factTable.columns?.filter(c => c.type === 'categorical') ?? [];
  const dateCol = factTable.dateColumn ? factTable.columns?.find(c => c.name === factTable.dateColumn) : null;

  const firstNum = numCols[0];
  const firstCat = catCols[0];
  const revMeasure = numCols.find(c => /revenue|sales|amount/i.test(c.name)) ?? firstNum;

  const kpiValue = firstNum ? sumFiltered(data, firstNum.name, filters) : data.length;
  const kpiLabel = firstNum ? `Total ${firstNum.name}` : 'Row Count';
  const revValue = revMeasure ? sumFiltered(data, revMeasure.name, filters) : 0;
  const growth = revMeasure && dateCol ? momGrowth(data, revMeasure.name, dateCol.name, filters) : null;

  const trendData = dateCol && (revMeasure || firstNum)
    ? (() => {
        const byMonth: Record<string, number> = {};
        const measureCol = revMeasure ?? firstNum!;
        data.forEach(row => {
          const d = new Date(String(row[dateCol.name]));
          if (isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          byMonth[key] = (byMonth[key] || 0) + (Number(row[measureCol.name]) || 0);
        });
        return Object.entries(byMonth).sort().map(([date, value]) => ({ date, value }));
      })()
    : [];

  const barData = firstCat
    ? (() => {
        const byCat: Record<string, number> = {};
        const measureCol = revMeasure ?? firstNum;
        data.forEach(row => {
          const k = String(row[firstCat.name] ?? '');
          byCat[k] = (byCat[k] || 0) + (measureCol ? (Number(row[measureCol.name]) || 0) : 1);
        });
        return Object.entries(byCat)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value }));
      })()
    : [];

  const treemapData = firstCat && (revMeasure || firstNum)
    ? (() => {
        const byCat: Record<string, number> = {};
        const measureCol = revMeasure ?? firstNum!;
        data.forEach(row => {
          const k = String(row[firstCat.name] ?? '');
          byCat[k] = (byCat[k] || 0) + (Number(row[measureCol.name]) || 0);
        });
        const total = Object.values(byCat).reduce((a, v) => a + v, 0) || 1;
        return Object.entries(byCat)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value], i) => ({ name, value, fill: DLUX.palette[i % DLUX.palette.length], pct: ((value / total) * 100).toFixed(1) }));
      })()
    : [];

  const waterfallData = dateCol && revMeasure ? buildWaterfallData(data, revMeasure.name, dateCol.name) : [];
  const funnelData = firstCat && (revMeasure || firstNum) ? buildFunnelData(data, firstCat, revMeasure ?? firstNum!) : [];

  const handleVisualClick = (id: string) => () => onSelectVisual(selectedVisual === id ? null : id);

  const chartCard = (id: string, title: string, subtitle: string, children: React.ReactNode) => (
    <motion.div
      id={`visual-${id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onClick={handleVisualClick(id)}
      className={`dlux-card p-5 cursor-pointer ${selectedVisual === id ? 'ring-1 ring-[#00D4FF] ring-offset-2 ring-offset-[#0B1220]' : ''}`}
    >
      <h3 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-0.5">{title}</h3>
      <p className="text-[10px] text-[#6B7280] mb-4">{subtitle}</p>
      {children}
    </motion.div>
  );

  const gap = boardMode ? 'gap-6' : 'gap-4';

  return (
    <div className="min-h-full p-6 sm:p-8">
      <div className={`max-w-[1600px] mx-auto ${boardMode ? 'space-y-8' : 'space-y-8'}`}>
        {/* ROW 1: 5 Premium KPI cards */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${gap}`}>
          <PowerBIKPICard label={kpiLabel} value={kpiValue} growth={growth} sparklineData={trendData} premium />
          {revMeasure && revMeasure !== firstNum && (
            <PowerBIKPICard label={`Total ${revMeasure.name}`} value={revValue} growth={growth} sparklineData={trendData} premium />
          )}
          <PowerBIKPICard label="Row Count" value={data.length} sparklineData={trendData} />
          <PowerBIKPICard
            label={firstCat ? `Unique ${firstCat.name}` : 'Unique Values'}
            value={firstCat ? distinctCountFiltered(data, firstCat.name, filters) : data.length}
            sparklineData={trendData}
          />
          {numCols.length >= 2 && (
            <PowerBIKPICard
              label={numCols.find(c => /cost|expense/i.test(c.name))?.name ?? 'Cost'}
              value={numCols.find(c => /cost|expense/i.test(c.name)) ? sumFiltered(data, numCols.find(c => /cost|expense/i.test(c.name))!.name, filters) : 0}
              sparklineData={trendData}
            />
          )}
        </div>

        <div className="h-px bg-[rgba(0,212,255,0.1)] my-8" />

        {/* ROW 2: Hero Performance Trend */}
        {trendData.length > 0 && (
          <>
            {chartCard(
              'trend',
              'Performance Trend',
              'BY MONTH',
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DLUX.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={DLUX.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={DLUX.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: DLUX.textMuted }} />
                  <YAxis tick={{ fontSize: 10, fill: DLUX.textMuted }} tickFormatter={v => formatExecutive(v)} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatExecutive(v), 'Value']} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={DLUX.primary}
                    strokeWidth={2.5}
                    fill="url(#heroFill)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={{ r: 4, fill: DLUX.primary }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div className="h-px bg-[rgba(0,212,255,0.1)] my-8" />
          </>
        )}

        {/* ROW 3: 50/50 Category Bar + Regional */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 ${gap}`}>
          {barData.length > 0 && (
            chartCard(
              'bar',
              `Category Breakdown — ${firstCat?.name ?? 'Categories'}`,
              'TOP 8 BY VALUE',
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={DLUX.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: DLUX.textMuted }} tickFormatter={v => formatExecutive(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: DLUX.textMuted }} width={90} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatExecutive(v), 'Value']} />
                  <Bar dataKey="value" fill={DLUX.primary} radius={[0, 6, 6, 0]} maxBarSize={32}>
                    <LabelList dataKey="value" position="right" fontSize={10} fill={DLUX.text} formatter={(v: number) => formatExecutive(v)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          )}
          {treemapData.length > 0 && (
            chartCard(
              'treemap',
              'Regional / Market Distribution',
              'TOP 5 BY SHARE',
              <div className="flex flex-col gap-3">
                {treemapData.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 h-10 rounded overflow-hidden bg-[rgba(255,255,255,0.04)]">
                      <div style={{ width: `${d.pct}%`, height: '100%', background: d.fill, minWidth: 8 }} className="rounded h-full" />
                    </div>
                    <span className="text-xs text-[#9CA3AF] w-20 truncate">{d.name}</span>
                    <span className="text-xs font-semibold text-[#E5E7EB] tabular-nums w-14">{d.pct}%</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* ROW 4: 50/50 Waterfall + Funnel */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 ${gap}`}>
          {waterfallData.length > 0 && (
            chartCard('waterfall', 'Risk Variance Waterfall', 'MOM CHANGE', <PowerBIWaterfall data={waterfallData} dark />)
          )}
          {funnelData.length > 0 && (
            chartCard('funnel', 'Growth Funnel', 'TOP CATEGORIES BY VALUE', <PowerBIFunnel data={funnelData} dark />)
          )}
        </div>

        {/* ROW 5: Full-width Executive Operational Intelligence */}
        {trendData.length > 0 && (
          <>
            <div className="h-px bg-[rgba(0,212,255,0.1)] my-8" />
            {chartCard(
              'trend-detail',
              'Executive Operational Intelligence',
              'ALL MONTHS',
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={DLUX.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: DLUX.textMuted }} />
                  <YAxis tick={{ fontSize: 10, fill: DLUX.textMuted }} tickFormatter={v => formatExecutive(v)} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatExecutive(v), 'Value']} />
                  <Line type="monotone" dataKey="value" stroke={DLUX.primary} strokeWidth={2} dot={{ r: 2, fill: DLUX.primary }} strokeLinecap="round" strokeLinejoin="round" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}

        {!trendData.length && !barData.length && !treemapData.length && (
          <div className="dlux-card p-12 text-center">
            <p className="text-sm text-[#9CA3AF]">No data available for visuals. Add categorical or numeric columns.</p>
          </div>
        )}
      </div>
    </div>
  );
}
