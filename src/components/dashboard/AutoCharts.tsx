import { useMemo, useRef, useState, useCallback } from 'react';
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
import { PALETTES, type PaletteId } from './PaletteSelector';
import { Download, Image, FileCode, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import html2canvas from 'html2canvas';

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

function exportAsPNG(el: HTMLElement, title: string) {
  html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true, logging: false }).then(canvas => {
    const link = document.createElement('a');
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

function exportAsSVG(el: HTMLElement, title: string) {
  const svgEl = el.querySelector('svg');
  if (!svgEl) {
    exportAsPNG(el, title);
    return;
  }
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!clone.getAttribute('width')) {
    clone.setAttribute('width', String(svgEl.clientWidth || 600));
    clone.setAttribute('height', String(svgEl.clientHeight || 400));
  }
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function ChartCard({ title, children, delay = 0, chartKey, dashboardId, subtitle }: {
  title: string; children: React.ReactNode; delay?: number;
  chartKey?: string; dashboardId?: string; subtitle?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [showExport, setShowExport] = useState(false);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.3, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.3, 0.5));
  const handleReset = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setScale(s => Math.min(Math.max(s + delta, 0.5), 4));
    } else if (scale > 1) {
      setPan(p => ({ x: p.x - e.deltaX * 0.5, y: p.y - e.deltaY * 0.5 }));
    }
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [scale, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  return (
    <motion.div ref={chartRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-4 sm:p-5 relative group"
      onMouseLeave={() => { setIsPanning(false); setShowExport(false); }}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground/90 tracking-wide">{title}</h3>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleZoomIn} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors" title="Zoom in (Ctrl+scroll)">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleZoomOut} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors" title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {scale !== 1 && (
            <button onClick={handleReset} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors" title="Reset">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {scale > 1 && (
            <span className="text-[9px] text-muted-foreground font-mono mx-0.5">{scale.toFixed(1)}×</span>
          )}
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors" title="Export">
              <Download className="w-3.5 h-3.5" />
            </button>
            {showExport && (
              <div className="absolute right-0 top-7 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  onClick={() => { if (chartRef.current) exportAsPNG(chartRef.current, title); setShowExport(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Image className="w-3.5 h-3.5" /> PNG
                </button>
                <button
                  onClick={() => { if (chartRef.current) exportAsSVG(chartRef.current, title); setShowExport(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5" /> SVG
                </button>
              </div>
            )}
          </div>
          {chartKey && dashboardId && <ChartAnnotations dashboardId={dashboardId} chartKey={chartKey} />}
        </div>
      </div>
      <div
        className="h-52 sm:h-72 overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
      >
        <div style={{
          transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.15s ease',
          width: '100%', height: '100%',
        }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
}

// Scatter/Dot Strip Plot — shows individual data points per category (like ggplot2 geom_jitter)
function DotStripPlot({ data, catCol, numCol, COLORS }: {
  data: Record<string, unknown>[]; catCol: string; numCol: string; COLORS: string[];
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
function BoxplotChart({ data, numCols, COLORS }: {
  data: Record<string, unknown>[];
  numCols: { name: string; stats: NonNullable<import('@/lib/dataProcessor').ColumnInfo['stats']> }[];
  COLORS: string[];
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
function FacetedBarChart({ data, catCols, numCol, COLORS }: {
  data: Record<string, unknown>[]; catCols: string[]; numCol: string; COLORS: string[];
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

// Violin Plot — kernel density estimation for distribution shape
function ViolinPlot({ data, numCols, COLORS }: {
  data: Record<string, unknown>[];
  numCols: { name: string; stats: NonNullable<import('@/lib/dataProcessor').ColumnInfo['stats']> }[];
  COLORS: string[];
}) {
  const violinData = useMemo(() => {
    return numCols.slice(0, 4).map((col, ci) => {
      const values = data.map(r => Number(r[col.name])).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (values.length < 5) return null;
      const min = values[0];
      const max = values[values.length - 1];
      const range = max - min || 1;
      const bins = 20;
      const bandwidth = range / bins;
      // Simple histogram-based density
      const density: { y: number; density: number }[] = [];
      for (let i = 0; i <= bins; i++) {
        const point = min + (i / bins) * range;
        let count = 0;
        values.forEach(v => {
          if (Math.abs(v - point) <= bandwidth) count++;
        });
        density.push({ y: point, density: count / values.length });
      }
      const maxDensity = Math.max(...density.map(d => d.density)) || 1;
      return {
        name: col.name.length > 10 ? col.name.slice(0, 10) + '…' : col.name,
        fullName: col.name,
        density: density.map(d => ({ ...d, normalized: d.density / maxDensity })),
        stats: col.stats,
        color: COLORS[ci % COLORS.length],
      };
    }).filter((v): v is { name: string; fullName: string; density: { y: number; density: number; normalized: number }[]; stats: NonNullable<import('@/lib/dataProcessor').ColumnInfo['stats']>; color: string } => v !== null);
  }, [data, numCols, COLORS]);

  if (violinData.length === 0) return null;

  const svgWidth = 100;
  const svgHeight = 100;

  return (
    <div className="flex items-end justify-around h-full px-2 pb-6 pt-2 gap-1">
      {violinData.map((violin, vi) => (
        <div key={vi} className="flex flex-col items-center flex-1 h-full">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
            {/* Violin shape — mirrored density */}
            <path
              d={
                violin.density.map((d, i) => {
                  const y = svgHeight - (i / violin.density.length) * svgHeight;
                  const x = svgWidth / 2 + d.normalized * (svgWidth / 2 - 4);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ') + ' ' +
                [...violin.density].reverse().map((d, i, arr) => {
                  const origIdx = arr.length - 1 - i;
                  const y = svgHeight - (origIdx / arr.length) * svgHeight;
                  const x = svgWidth / 2 - d.normalized * (svgWidth / 2 - 4);
                  return `L ${x} ${y}`;
                }).join(' ') + ' Z'
              }
              fill={violin.color}
              fillOpacity={0.35}
              stroke={violin.color}
              strokeWidth={1.5}
            />
            {/* Median line */}
            {(() => {
              const medianY = svgHeight - ((violin.stats.median - violin.stats.min) / (violin.stats.max - violin.stats.min || 1)) * svgHeight;
              return <line x1={svgWidth * 0.25} x2={svgWidth * 0.75} y1={medianY} y2={medianY} stroke={violin.color} strokeWidth={2} />;
            })()}
            {/* IQR box */}
            {(() => {
              const range = violin.stats.max - violin.stats.min || 1;
              const q1Y = svgHeight - ((violin.stats.q1 - violin.stats.min) / range) * svgHeight;
              const q3Y = svgHeight - ((violin.stats.q3 - violin.stats.min) / range) * svgHeight;
              return <rect x={svgWidth * 0.38} width={svgWidth * 0.24} y={q3Y} height={q1Y - q3Y}
                fill={violin.color} fillOpacity={0.3} stroke={violin.color} strokeWidth={1} rx={2} />;
            })()}
          </svg>
          <span className="text-[9px] text-muted-foreground font-medium mt-1 truncate max-w-full">{violin.name}</span>
        </div>
      ))}
    </div>
  );
}

interface AutoChartsProps {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
  paletteId?: PaletteId;
}

export default function AutoCharts({ analysis, filteredData, paletteId = 'ggplot2' }: AutoChartsProps) {
  const COLORS = PALETTES[paletteId].colors;
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const charts: React.ReactNode[] = [];
  let chartIdx = 0;

  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);

  // Pre-compute memoized data for charts (hooks must be at top level)
  const stackedData = useMemo(() => {
    if (catCols.length < 2) return { data: [], keys: [] as string[] };
    const groupCol = catCols[0];
    const stackCol = catCols[1];
    const groups: Record<string, Record<string, number>> = {};
    const allStacks = new Set<string>();
    filteredData.forEach(row => {
      const g = String(row[groupCol.name] ?? '');
      const s = String(row[stackCol.name] ?? '');
      if (!g || !s) return;
      allStacks.add(s);
      if (!groups[g]) groups[g] = {};
      groups[g][s] = (groups[g][s] || 0) + 1;
    });
    const stackKeys = Array.from(allStacks).slice(0, 6);
    const result = Object.entries(groups).slice(0, 12).map(([name, counts]) => {
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      const entry: Record<string, unknown> = { name: name.length > 10 ? name.slice(0, 10) + '…' : name };
      stackKeys.forEach(sk => { entry[sk] = +((counts[sk] || 0) / total * 100).toFixed(1); });
      return entry;
    });
    return { data: result, keys: stackKeys };
  }, [filteredData, catCols]);

  const heatmapContent = useMemo(() => {
    if (numCols.length < 2) return { cols: [] as string[], rows: [] as { label: string; values: number[] }[] };
    const cols = numCols.slice(0, 8);
    const sampleRows = filteredData.slice(0, 30);
    const colStats = cols.map(col => {
      const vals = sampleRows.map(r => Number(r[col.name])).filter(n => !isNaN(n));
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length || 0;
      const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
      return { name: col.name, mean, std };
    });
    const sortedCols = [...colStats].sort((a, b) => b.std - a.std);
    const rows = sampleRows.map((row, ri) => ({
      label: String(row[analysis.columnInfo[0]?.name] || `#${ri + 1}`).slice(0, 8),
      values: sortedCols.map(cs => {
        const raw = Number(row[cs.name]);
        if (isNaN(raw)) return 0;
        return (raw - cs.mean) / cs.std;
      }),
    })).sort((a, b) => (b.values[0] || 0) - (a.values[0] || 0));
    return { cols: sortedCols.map(c => c.name), rows };
  }, [filteredData, numCols, analysis]);

  const networkContent = useMemo(() => {
    if (numCols.length < 3) return { nodes: [] as { name: string; x: number; y: number; color: string }[], edges: [] as { from: number; to: number; strength: number }[] };
    const cols = numCols.slice(0, 10);
    const nodes = cols.map((col, i) => {
      const angle = (2 * Math.PI * i) / cols.length;
      const r = 38;
      return { name: col.name, x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle), color: COLORS[i % COLORS.length] };
    });
    const edges: { from: number; to: number; strength: number }[] = [];
    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const valsI = filteredData.map(r => Number(r[cols[i].name])).filter(n => !isNaN(n));
        const valsJ = filteredData.map(r => Number(r[cols[j].name])).filter(n => !isNaN(n));
        const len = Math.min(valsI.length, valsJ.length, 200);
        if (len < 5) continue;
        const meanI = valsI.slice(0, len).reduce((a, b) => a + b, 0) / len;
        const meanJ = valsJ.slice(0, len).reduce((a, b) => a + b, 0) / len;
        let num = 0, denI = 0, denJ = 0;
        for (let k = 0; k < len; k++) {
          const di = valsI[k] - meanI, dj = valsJ[k] - meanJ;
          num += di * dj; denI += di * di; denJ += dj * dj;
        }
        const corr = denI && denJ ? num / Math.sqrt(denI * denJ) : 0;
        if (Math.abs(corr) > 0.2) edges.push({ from: i, to: j, strength: corr });
      }
    }
    return { nodes, edges };
  }, [filteredData, numCols, COLORS]);

  // 1. Scatter Dot Strip Plot — categorical × numeric (ggplot2 geom_jitter style)
  if (catCols.length > 0 && numCols.length > 0) {
    charts.push(
      <ChartCard key="dot-strip" title={`${catCols[0].name} × ${numCols[0].name}`}
        subtitle="Scatter dot strip plot · Individual data points" delay={chartIdx++ * 0.1}>
        <DotStripPlot data={filteredData} catCol={catCols[0].name} numCol={numCols[0].name} COLORS={COLORS} />
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
        <BoxplotChart data={filteredData} numCols={numWithStats} COLORS={COLORS} />
      </ChartCard>
    );
  }

  // 5b. Violin Plot
  if (numWithStats.length >= 1) {
    charts.push(
      <ChartCard key="violin" title="Violin Plot" subtitle="Taqsimot shakli · KDE + IQR" delay={chartIdx++ * 0.1}>
        <ViolinPlot data={filteredData} numCols={numWithStats} COLORS={COLORS} />
      </ChartCard>
    );
  }

  // 6. Faceted small multiples (if multiple categoricals + numeric)
  if (catCols.length >= 2 && numCols.length > 0) {
    charts.push(
      <ChartCard key="facets" title="Faceted Comparison"
        subtitle={`${numCols[0].name} by category · Small multiples`} delay={chartIdx++ * 0.1}>
        <FacetedBarChart data={filteredData} catCols={catCols.map(c => c.name)} numCol={numCols[0].name} COLORS={COLORS} />
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

  // 8. Stacked Percentage Bar
  if (catCols.length >= 2 && numCols.length > 0 && stackedData.data.length > 0) {
    charts.push(
      <ChartCard key="stacked-bar" title={`${catCols[0].name} × ${catCols[1].name}`}
        subtitle="100% Stacked bar · Guruhlarni solishtirish" delay={chartIdx++ * 0.1}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stackedData.data} margin={{ left: 10, right: 20, bottom: 40, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10 }} angle={-35} textAnchor="end" axisLine={{ stroke: gridStroke }} />
            <YAxis tick={axisStyle} axisLine={{ stroke: gridStroke }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...tooltipStyle} formatter={(val: number) => `${val}%`} />
            {stackedData.keys.map((key, ki) => (
              <Bar key={key} dataKey={key} stackId="stack" fill={COLORS[ki % COLORS.length]} fillOpacity={0.8} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // 9. Donut chart (kept for single categorical)
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

  // 10. Data Heatmap
  const getHeatColor = (z: number) => {
    const clamped = Math.max(-3, Math.min(3, z));
    const ht = (clamped + 3) / 6;
    if (ht < 0.2) return 'hsl(55, 80%, 75%)';
    if (ht < 0.4) return 'hsl(170, 40%, 80%)';
    if (ht < 0.6) return 'hsl(190, 50%, 75%)';
    if (ht < 0.8) return 'hsl(200, 60%, 60%)';
    return 'hsl(210, 70%, 35%)';
  };

  if (numCols.length >= 2 && heatmapContent.rows.length > 0) {
    charts.push(
      <ChartCard key="data-heatmap" title="Data Heatmap"
        subtitle="Z-score · Rows/columns reordered by variance" delay={chartIdx++ * 0.1}>
        <div className="overflow-auto h-full scrollbar-thin">
          <div className="inline-block min-w-full">
            <div className="flex">
              <div className="w-16 shrink-0" />
              {heatmapContent.cols.map(col => (
                <div key={col} className="w-10 h-6 flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground font-medium -rotate-45 origin-center truncate max-w-[36px]">
                    {col.length > 6 ? col.slice(0, 6) + '…' : col}
                  </span>
                </div>
              ))}
            </div>
            {heatmapContent.rows.map((row, ri) => (
              <div key={ri} className="flex">
                <div className="w-16 shrink-0 flex items-center pr-1">
                  <span className="text-[8px] text-muted-foreground truncate">{row.label}</span>
                </div>
                {row.values.map((z, ci) => (
                  <div key={ci} className="w-10 h-5 m-px rounded-sm cursor-default transition-transform hover:scale-125 hover:z-10"
                    style={{ backgroundColor: getHeatColor(z) }}
                    title={`z = ${z.toFixed(2)}`}
                  />
                ))}
              </div>
            ))}
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
              <span className="text-[9px] text-muted-foreground">Low</span>
              <div className="flex gap-0">
                {[-3, -1.5, 0, 1.5, 3].map((z, i) => (
                  <div key={i} className="w-5 h-2.5 first:rounded-l-sm last:rounded-r-sm" style={{ backgroundColor: getHeatColor(z) }} />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground">High</span>
            </div>
          </div>
        </div>
      </ChartCard>
    );
  }

  // 11. Correlation Network Graph
  if (numCols.length >= 3 && networkContent.nodes.length > 0) {
    charts.push(
      <ChartCard key="network" title="Correlation Network"
        subtitle="Ustunlar orasidagi bog'lanishlar · |r| > 0.2" delay={chartIdx++ * 0.1}>
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ maxHeight: '100%' }}>
          {networkContent.edges.map((edge, i) => {
            const from = networkContent.nodes[edge.from];
            const to = networkContent.nodes[edge.to];
            const opacity = Math.abs(edge.strength) * 0.8;
            const width = 0.3 + Math.abs(edge.strength) * 1.5;
            return (
              <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={edge.strength > 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                strokeOpacity={opacity} strokeWidth={width}
              />
            );
          })}
          {networkContent.nodes.map((node, i) => (
            <g key={i}>
              <circle cx={node.x} cy={node.y} r={3} fill={node.color} stroke="hsl(var(--card))" strokeWidth={0.5} />
              <text x={node.x} y={node.y - 4} textAnchor="middle" fill="hsl(var(--foreground))"
                fontSize={2.8} fontFamily='"Space Grotesk", sans-serif'>
                {node.name.length > 8 ? node.name.slice(0, 8) + '…' : node.name}
              </text>
            </g>
          ))}
        </svg>
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
