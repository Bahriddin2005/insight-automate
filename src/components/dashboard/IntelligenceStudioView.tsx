/**
 * Intelligence Studio — Futuristic 3D dashboard matching INTELLIGENCE STUDIO design
 * Dark space theme, glowing cards, 3D charts, AI insight panel
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Zap, Layers, ShieldCheck, Sparkles, LayoutGrid, Download, Bell, Settings, Globe,
  ChevronRight, LayoutDashboard, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { getCorrelationMatrix } from '@/lib/dataProcessor';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { exportDashboardAsPNG } from '@/lib/exportDashboard';
import { useI18n } from '@/lib/i18nContext';

const GLOW_COLORS = {
  teal: 'rgba(34, 211, 238, 0.5)',
  yellow: 'rgba(251, 191, 36, 0.5)',
  green: 'rgba(34, 197, 94, 0.5)',
  blue: 'rgba(59, 130, 246, 0.5)',
  purple: 'rgba(168, 85, 247, 0.5)',
};

const BAR_GRADIENTS = [
  { id: 'g1', colors: ['#22d3ee', '#0e7490'] },
  { id: 'g2', colors: ['#fbbf24', '#b45309'] },
  { id: 'g3', colors: ['#a855f7', '#6b21a8'] },
  { id: 'g4', colors: ['#22c55e', '#15803d'] },
  { id: 'g5', colors: ['#f97316', '#c2410c'] },
  { id: 'g6', colors: ['#ec4899', '#be185d'] },
  { id: 'g7', colors: ['#3b82f6', '#1d4ed8'] },
  { id: 'g8', colors: ['#14b8a6', '#0f766e'] },
];

interface Props {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
  fileName: string;
  onSwitchToStandard?: () => void;
  onPowerBI?: () => void;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100 / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * w},${80 - ((v - min) / range) * 60}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity={0} />
          <stop offset="100%" stopColor={color} stopOpacity={0.6} />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function IntelligenceStudioView({ analysis, filteredData, fileName, onSwitchToStandard, onPowerBI }: Props) {
  const { t } = useI18n();

  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  const dateCol = analysis.columnInfo.find(c => c.type === 'datetime');

  const trendData = useMemo(() => {
    if (!dateCol || !numCols[0]) return [];
    const byMonth: Record<string, number> = {};
    filteredData.forEach(row => {
      const d = new Date(String(row[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + (Number(row[numCols[0].name]) || 0);
    });
    return Object.entries(byMonth).sort().map(([date, value]) => ({ date, value }));
  }, [filteredData, dateCol, numCols]);

  const barData = useMemo(() => {
    const col = catCols[0];
    if (!col?.topValues) return [];
    return col.topValues.slice(0, 8).map(v => ({ name: v.value, value: v.count }));
  }, [catCols]);

  const histData = useMemo(() => {
    const col = numCols[0];
    if (!col?.stats) return [];
    const vals = filteredData.map(r => Number(r[col.name])).filter(n => !isNaN(n));
    if (!vals.length) return [];
    const min = col.stats.min;
    const max = col.stats.max;
    const buckets = 8;
    const step = (max - min) / buckets || 1;
    return Array.from({ length: buckets }, (_, i) => {
      const lo = min + i * step;
      const hi = i === buckets - 1 ? max + 0.001 : lo + step;
      return { range: max > 1000 ? `${(lo / 1000).toFixed(1)}k` : lo.toFixed(0), count: vals.filter(v => v >= lo && v < hi).length };
    });
  }, [filteredData, numCols]);

  const { columns: corrCols, matrix } = useMemo(
    () => getCorrelationMatrix(filteredData, numCols.slice(0, 6).map(c => c.name)),
    [filteredData, numCols]
  );

  const sparkData = useMemo(() => {
    if (!trendData.length) return [0.2, 0.5, 0.3, 0.7, 0.6, 0.9];
    const vals = trendData.map(d => d.value);
    const max = Math.max(...vals);
    return vals.map(v => max ? v / max : 0);
  }, [trendData]);

  const insights = useMemo(() => {
    const list: string[] = [];
    if (analysis.qualityScore >= 85) list.push(t('insights.qualityExcellent', { score: analysis.qualityScore }));
    else list.push(t('insights.qualityGood', { score: analysis.qualityScore }));
    list.push(t('insights.dataset', { rows: analysis.rows.toLocaleString(), cols: analysis.columns.toString() }));
    if (catCols[0]?.topValues?.[0]) {
      list.push(t('insights.topValue', {
        col: catCols[0].name,
        val: catCols[0].topValues[0].value,
        count: catCols[0].topValues[0].count.toLocaleString(),
      }));
    }
    if (numCols[0]?.stats) {
      list.push(t('insights.numRange', {
        col: numCols[0].name,
        min: numCols[0].stats!.min.toLocaleString(),
        max: numCols[0].stats!.max.toLocaleString(),
        avg: numCols[0].stats!.mean.toFixed(2),
      }));
    }
    return list.slice(0, 4);
  }, [analysis, catCols, numCols, t]);

  const kpiCards = [
    { label: t('kpi.totalRows'), value: analysis.rows.toLocaleString(), icon: Database, glow: GLOW_COLORS.teal, change: '+12% (17 d)' },
    { label: t('kpi.avgLatency') || 'Avg Value', value: numCols[0]?.stats?.mean?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—', icon: Zap, glow: GLOW_COLORS.yellow, change: '+9.5% (7 d)' },
    { label: t('kpi.totalColumns'), value: analysis.columns.toString(), icon: Layers, glow: GLOW_COLORS.green, change: '+8.3% (7 d)' },
    { label: t('kpi.quality'), value: `${analysis.qualityScore}/100`, icon: ShieldCheck, glow: GLOW_COLORS.teal, change: '+2 pts (7 d)' },
  ];

  return (
    <div id="intelligence-studio-export" className="min-h-screen intelligence-studio-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 intelligence-studio-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="intelligence-studio-logo">
              <LayoutGrid className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-white tracking-wide">INTELLIGENCE STUDIO</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Bell className="w-4 h-4" />
              <Settings className="w-4 h-4" />
              <Globe className="w-4 h-4" />
            </div>
            <select className="intelligence-studio-select text-xs">
              <option>Data Overview</option>
            </select>
            <span className="text-xs text-gray-500 hidden sm:inline">1/{analysis.rows}</span>
            <select className="intelligence-studio-select text-xs">
              <option>Last 7 Days</option>
            </select>
            {onSwitchToStandard && (
              <Button size="sm" variant="ghost" onClick={onSwitchToStandard} className="gap-1.5 text-gray-400 hover:text-white">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Standard
              </Button>
            )}
            {onPowerBI && (
              <Button size="sm" variant="outline" onClick={onPowerBI} className="gap-1.5 border-[#ffaa00]/50 text-[#ffaa00] hover:bg-[#ffaa00]/10">
                <BarChart3 className="w-3.5 h-3.5" />
                Power BI
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="intelligence-studio-export-btn gap-1.5"
              onClick={() => exportDashboardAsPNG('intelligence-studio-export', fileName)}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-8">
        {/* KPI Cards row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="intelligence-kpi-card"
              style={{ boxShadow: `0 0 30px -8px ${card.glow}, inset 0 1px 0 0 rgba(255,255,255,0.06)` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.glow}20` }}>
                  <card.icon className="w-4 h-4" style={{ color: card.glow }} />
                </div>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums mb-2">{card.value}</p>
              <div className="h-8 opacity-60">
                <MiniSparkline data={sparkData} color={card.glow} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: card.glow }}>{card.change}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts row 1: Trend + Distribution + AI insight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latency / Trend over time */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 intelligence-chart-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                {dateCol && numCols[0] ? `${numCols[0].name} ${t('chart.overTime')}` : t('chart.trend') || 'Trend'}
              </h3>
            </div>
            <div className="intelligence-chart-base">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(34, 211, 238, 0.5)" />
                        <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 211, 238, 0.2)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="value" stroke="none" fill="url(#area-grad)" />
                    <Line type="monotone" dataKey="value" stroke="rgba(34, 211, 238, 0.9)" strokeWidth={2.5} dot={{ fill: 'rgba(34, 211, 238)', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">No trend data</div>
              )}
            </div>
          </motion.div>

          {/* AI insight */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="intelligence-chart-card intelligence-ai-insight"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">AI insight</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
            <ul className="space-y-2.5">
              {insights.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                  <span className="w-1 h-1 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Charts row 2: Distribution + Model Usage + Correlations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Token Distribution / Bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="intelligence-chart-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  {catCols[0]?.name || t('chart.distribution')}
                </h3>
              </div>
              <div className="flex gap-1">
                <button className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">Count</button>
                <button className="text-[10px] px-2 py-0.5 rounded text-gray-500">Percent</button>
              </div>
            </div>
            <div className="intelligence-chart-base">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: 10 }}>
                    <defs>
                      {BAR_GRADIENTS.slice(0, barData.length).map((g, i) => (
                        <linearGradient key={g.id} id={g.id} x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor={g.colors[1]} />
                          <stop offset="100%" stopColor={g.colors[0]} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.15)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={`url(#g${(i % BAR_GRADIENTS.length) + 1})`} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                      ))}
                      <LabelList dataKey="value" position="top" fill="rgba(255,255,255,0.8)" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">No data</div>
              )}
            </div>
          </motion.div>

          {/* Model Usage / Histogram */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="intelligence-chart-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                {numCols[0]?.name || t('chart.distribution')}
              </h3>
            </div>
            <div className="intelligence-chart-base">
              {histData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={histData} margin={{ top: 10, right: 10, left: 10 }}>
                    <defs>
                      {BAR_GRADIENTS.slice(0, 6).map((g, i) => (
                        <linearGradient key={g.id} id={`hist-${g.id}`} x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor={g.colors[1]} />
                          <stop offset="100%" stopColor={g.colors[0]} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.15)" vertical={false} />
                    <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {histData.map((_, i) => (
                        <Cell key={i} fill={`url(#hist-g${(i % 6) + 1})`} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                      ))}
                      <LabelList dataKey="count" position="top" fill="rgba(255,255,255,0.8)" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">No data</div>
              )}
            </div>
          </motion.div>

          {/* Correlations — 3D cube style */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="intelligence-chart-card intelligence-correlations"
          >
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{t('chart.correlation')}</h3>
            </div>
            <div className="intelligence-chart-base intelligence-cube-base">
              {corrCols.length >= 2 ? (
                <div className="intelligence-correlation-grid overflow-auto max-h-[220px]">
                  <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `24px repeat(${corrCols.length}, 28px)`, gridTemplateRows: `24px repeat(${corrCols.length}, 28px)` }}>
                    <div />
                    {corrCols.map(c => (
                      <div key={`h-${c}`} className="text-[9px] text-cyan-400/80 truncate px-0.5 flex items-center justify-center">
                        {c.length > 6 ? c.slice(0, 6) + '…' : c}
                      </div>
                    ))}
                    {matrix.map((row, i) => (
                      <React.Fragment key={`row-${i}`}>
                        <div className="text-[9px] text-cyan-400/80 truncate flex items-center pr-1">
                          {corrCols[i]?.length > 6 ? corrCols[i].slice(0, 6) + '…' : corrCols[i]}
                        </div>
                        {row.map((val, j) => (
                          <div
                            key={`${i}-${j}`}
                            className="rounded-sm flex items-center justify-center text-[9px] font-medium transition-all hover:scale-110 min-w-[28px] min-h-[28px]"
                            style={{
                              background: val > 0
                                ? `rgba(34, 211, 238, ${Math.min(0.8, val * 0.8)})`
                                : `rgba(248, 113, 113, ${Math.min(0.8, Math.abs(val) * 0.8)})`,
                              color: Math.abs(val) > 0.5 ? 'white' : 'rgba(255,255,255,0.7)',
                              boxShadow: `0 0 12px ${val > 0 ? 'rgba(34,211,238,0.4)' : 'rgba(248,113,113,0.4)'}`,
                            }}
                          >
                            {val.toFixed(1)}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">Need 2+ numeric columns</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom gradient bar */}
        <div className="intelligence-bottom-bar" />
      </main>
    </div>
  );
}
