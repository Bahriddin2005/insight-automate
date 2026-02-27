import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useScribe } from '@elevenlabs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, ArrowLeft, Brain, Activity, AlertCircle, Loader2, Upload, MessageSquare, Plus, Trash2, FileSpreadsheet, Send, Download, Sparkles, Wrench, CheckCircle2, User, Play, Square, BarChart3, TrendingUp, PieChart as PieChartIcon, AreaChart, ScatterChart as ScatterIcon, Maximize2, X, ZoomIn, ZoomOut, Move, RotateCcw, HelpCircle, Command } from 'lucide-react';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { parseFile, analyzeDataset, generateInsights } from '@/lib/dataProcessor';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import ReactMarkdown from 'react-markdown';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart as RechartsArea,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
} from 'recharts';

export type AidaChartData = {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'stacked_bar' | 'radar';
  data: { name: string; value: number; value2?: number }[];
  title?: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  chartData?: AidaChartData;
  charts?: AidaChartData[];
};

type AidaState = 'sleeping' | 'listening' | 'thinking' | 'speaking';

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

// Waveform visualizer component
function WaveformVisualizer({ state, audioRef }: { state: AidaState; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 200;
    const H = 200;
    canvas.width = W;
    canvas.height = H;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const audioCtx = audioCtxRef.current;

    if (!analyserRef.current) {
      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    if (state === 'listening') {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        micStreamRef.current = stream;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        micSourceRef.current = audioCtx.createMediaStreamSource(stream);
        micSourceRef.current.connect(analyser);
      }).catch(() => {});
    } else {
      if (micSourceRef.current) { try { micSourceRef.current.disconnect(); } catch {} micSourceRef.current = null; }
      if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    }

    if (state === 'speaking' && audioRef.current && !sourceRef.current) {
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch { /* already connected */ }
    }

    const colors: Record<AidaState, string> = {
      sleeping: 'hsla(240,5%,65%,0.3)',
      listening: 'hsla(142,71%,45%,0.8)',
      thinking: 'hsla(38,92%,50%,0.8)',
      speaking: 'hsla(250,91%,66%,0.8)',
    };

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      const baseRadius = 40;
      const bars = 48;
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        const dataIdx = Math.floor((i / bars) * bufferLength);
        const val = dataArray[dataIdx] / 255;
        const barHeight = val * 30 + 2;
        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * (baseRadius + barHeight);
        const y2 = cy + Math.sin(angle) * (baseRadius + barHeight);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = colors[state];
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    };
    draw();
    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, [state]);

  useEffect(() => {
    return () => {
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ width: 200, height: 200 }}
    />
  );
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8b5cf6', '#ec4899', '#14b8a6'];

// Build ALL possible charts from a dataset analysis — full dashboard in chat
function buildAllChartsFromAnalysis(analysis: DatasetAnalysis): AidaChartData[] {
  const { columnInfo, cleanedData } = analysis;
  const charts: AidaChartData[] = [];

  const catCols = columnInfo.filter(c => c.type === 'categorical' && c.topValues && c.topValues.length > 1);
  const numCols = columnInfo.filter(c => c.type === 'numeric' && c.stats);
  const dateCol = columnInfo.find(c => c.type === 'datetime');

  // 1) Top categorical → bar chart
  if (catCols[0]?.topValues) {
    const data = catCols[0].topValues.slice(0, 12).map(t => ({ name: t.value, value: t.count }));
    charts.push({ type: 'bar', data, title: `📊 ${catCols[0].name} — Taqsimot` });
  }

  // 2) Second categorical → pie chart
  if (catCols[1]?.topValues) {
    const data = catCols[1].topValues.slice(0, 8).map(t => ({ name: t.value, value: t.count }));
    charts.push({ type: 'pie', data, title: `🥧 ${catCols[1].name} — Ulushlar` });
  }

  // 3) Time series → area chart  
  if (dateCol && numCols[0] && cleanedData.length > 0) {
    const byDate: Record<string, number> = {};
    cleanedData.forEach(row => {
      const d = new Date(String(row[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      const val = Number(row[numCols[0].name]);
      if (!isNaN(val)) byDate[key] = (byDate[key] || 0) + val;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    if (sorted.length > 2) {
      charts.push({ type: 'area', data: sorted.map(([name, value]) => ({ name: name.slice(5), value })), title: `📈 ${numCols[0].name} — Vaqt bo'yicha trend` });
    }
  }

  // 4) Numeric distribution → bar histogram
  if (numCols[0] && cleanedData.length > 0) {
    const vals = cleanedData.map(r => Number(r[numCols[0].name])).filter(n => !isNaN(n));
    if (vals.length > 0) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const step = (max - min) / 8 || 1;
      const buckets: Record<string, number> = {};
      vals.forEach(v => {
        const bucket = `${(Math.floor((v - min) / step) * step + min).toFixed(0)}`;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
      });
      const data = Object.entries(buckets).sort(([a], [b]) => Number(a) - Number(b)).map(([n, v]) => ({ name: n, value: v }));
      charts.push({ type: 'bar', data, title: `📊 ${numCols[0].name} — Taqsimot histogrammasi` });
    }
  }

  // 5) If two numeric columns → scatter plot
  if (numCols.length >= 2 && cleanedData.length > 0) {
    const scatter = cleanedData.slice(0, 200).map(row => ({
      name: '',
      value: Number(row[numCols[0].name]) || 0,
      value2: Number(row[numCols[1].name]) || 0,
    })).filter(d => !isNaN(d.value) && !isNaN(d.value2));
    if (scatter.length > 5) {
      charts.push({ type: 'scatter', data: scatter, title: `🔵 ${numCols[0].name} vs ${numCols[1].name}` });
    }
  }

  // 6) Categorical + numeric → stacked/grouped bar
  if (catCols[0]?.topValues && numCols[0] && cleanedData.length > 0) {
    const grouped: Record<string, number> = {};
    cleanedData.forEach(row => {
      const cat = String(row[catCols[0].name] || 'Boshqa');
      const val = Number(row[numCols[0].name]);
      if (!isNaN(val)) grouped[cat] = (grouped[cat] || 0) + val;
    });
    const sorted = Object.entries(grouped).sort(([, a], [, b]) => b - a).slice(0, 10);
    if (sorted.length > 1) {
      charts.push({ type: 'bar', data: sorted.map(([name, value]) => ({ name, value })), title: `📊 ${catCols[0].name} bo'yicha ${numCols[0].name} yig'indisi` });
    }
  }

  // 7) If second time series + numeric → line
  if (dateCol && numCols[1] && cleanedData.length > 0) {
    const byDate: Record<string, number> = {};
    cleanedData.forEach(row => {
      const d = new Date(String(row[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      const val = Number(row[numCols[1].name]);
      if (!isNaN(val)) byDate[key] = (byDate[key] || 0) + val;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    if (sorted.length > 2) {
      charts.push({ type: 'line', data: sorted.map(([name, value]) => ({ name: name.slice(5), value })), title: `📉 ${numCols[1].name} — Dinamika` });
    }
  }

  return charts;
}

// Build single chart from analysis (for analysis requests)
function buildChartFromAnalysis(analysis: DatasetAnalysis): AidaChartData | null {
  const { columnInfo, cleanedData } = analysis;
  const catCol = columnInfo.find(c => c.type === 'categorical' && c.topValues && c.topValues.length > 0);
  const numCol = columnInfo.find(c => c.type === 'numeric' && c.stats);
  const dateCol = columnInfo.find(c => c.type === 'datetime');

  if (catCol?.topValues && catCol.topValues.length > 0) {
    const data = catCol.topValues.slice(0, 10).map(t => ({ name: t.value, value: t.count }));
    return { type: 'bar', data, title: `${catCol.name} — eng ko'p qiymatlar` };
  }
  if (dateCol && numCol && cleanedData.length > 0) {
    const byDate: Record<string, number> = {};
    cleanedData.forEach(row => {
      const d = new Date(String(row[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      const val = Number(row[numCol.name]);
      if (!isNaN(val)) byDate[key] = (byDate[key] || 0) + val;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    const data = sorted.map(([name, value]) => ({ name: name.slice(5), value }));
    if (data.length > 0) return { type: 'line', data, title: `${numCol.name} — vaqt bo'yicha` };
  }
  if (numCol && cleanedData.length > 0) {
    const vals = cleanedData.map(r => Number(r[numCol.name])).filter(n => !isNaN(n));
    if (vals.length === 0) return null;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const step = (max - min) / 6 || 1;
    const buckets: Record<string, number> = {};
    vals.forEach(v => {
      const bucket = `${(Math.floor((v - min) / step) * step + min).toFixed(0)}`;
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    });
    const data = Object.entries(buckets).sort(([a], [b]) => Number(a) - Number(b)).map(([n, v]) => ({ name: n, value: v }));
    if (data.length > 0) return { type: 'bar', data, title: `${numCol.name} — taqsimot` };
  }
  return null;
}

function isAnalysisRequest(question: string): boolean {
  const q = question.toLowerCase().trim();
  const triggers = ['analiz', 'tahlil', 'buni analiz', 'grafik', 'chart', 'ko\'rsat', 'korsat', 'vizual', 'qanday', 'summary', 'xulosa', 'tahlil qil', 'analiz qil', 'dashboard', 'diagramma'];
  return triggers.some(t => q.includes(t));
}

// Export a chart element as PNG
function exportChartAsPNG(el: HTMLElement, title: string) {
  import('html2canvas').then(({ default: html2canvas }) => {
    html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true, logging: false }).then(canvas => {
      const link = document.createElement('a');
      link.download = `${(title || 'chart').replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('PNG yuklandi!');
    });
  });
}

// Export a chart element as PDF via print window
function exportChartAsPDF(el: HTMLElement, title: string) {
  import('html2canvas').then(({ default: html2canvas }) => {
    html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true, logging: false }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const w = canvas.width / 2;
      const h = canvas.height / 2;
      printWindow.document.write(`<!DOCTYPE html><html><head><title>${title || 'Chart'}</title><style>@page{size:${w}px ${h}px;margin:0}body{margin:0}img{width:100%;height:auto;display:block}</style></head><body><img src="${imgData}"/></body></html>`);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
      toast.success('PDF tayyorlandi!');
    });
  });
}

// Fullscreen chart modal
function FullscreenChartModal({ chart, onClose }: { chart: AidaChartData | null; onClose: () => void }) {
  const fsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  if (!chart?.data?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-foreground">{chart.title || 'Diagramma'}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => fsRef.current && exportChartAsPNG(fsRef.current, chart.title || 'chart')}
            className="text-xs px-3 py-1.5 rounded-md bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">PNG</button>
          <button onClick={() => fsRef.current && exportChartAsPDF(fsRef.current, chart.title || 'chart')}
            className="text-xs px-3 py-1.5 rounded-md bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">PDF</button>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div ref={fsRef} className="flex-1 p-6" onClick={e => e.stopPropagation()}>
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === 'bar' ? (
              <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Qiymat" />
              </BarChart>
            ) : chart.type === 'line' ? (
              <LineChart data={chart.data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Qiymat" />
              </LineChart>
            ) : chart.type === 'area' ? (
              <RechartsArea data={chart.data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="fsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#fsAreaGrad)" strokeWidth={3} name="Qiymat" />
              </RechartsArea>
            ) : chart.type === 'scatter' ? (
              <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="value" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" name="X" />
                <YAxis dataKey="value2" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" name="Y" />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Scatter data={chart.data} fill="hsl(var(--primary))" fillOpacity={0.7} />
              </ScatterChart>
            ) : (
              <PieChart>
                <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {chart.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

// Interactive chart wrapper with zoom/pan
function useChartZoomPan() {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 4));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const reset = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setScale(s => Math.min(Math.max(s + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 4));
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - panStart.current.x),
      y: translateStart.current.y + (e.clientY - panStart.current.y),
    });
  };

  const onPointerUp = () => setIsPanning(false);

  const style: React.CSSProperties = {
    transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
    transformOrigin: 'center center',
    cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
    transition: isPanning ? 'none' : 'transform 0.15s ease-out',
  };

  return { scale, style, zoomIn, zoomOut, reset, onWheel, onPointerDown, onPointerMove, onPointerUp };
}

// Enhanced inline chart component with zoom/pan
function AidaMessageChart({ type, data, title, onFullscreen }: AidaChartData & { onFullscreen?: () => void }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const zp = useChartZoomPan();

  if (!data?.length) return null;
  return (
    <motion.div
      ref={chartRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mt-3 rounded-xl border border-border/50 bg-muted/30 p-3"
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        {title && <p className="text-xs font-semibold text-muted-foreground">{title}</p>}
        <div className="flex gap-1 ml-auto items-center">
          <button onClick={zp.zoomIn} className="p-0.5 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Zoom in">
            <ZoomIn className="w-3 h-3" />
          </button>
          <span className="text-[9px] text-muted-foreground min-w-[28px] text-center">{Math.round(zp.scale * 100)}%</span>
          <button onClick={zp.zoomOut} className="p-0.5 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Zoom out">
            <ZoomOut className="w-3 h-3" />
          </button>
          {zp.scale !== 1 && (
            <button onClick={zp.reset} className="p-0.5 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Reset">
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <div className="w-px h-3 bg-border mx-0.5" />
          <button onClick={onFullscreen} className="p-0.5 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="To'liq ekran">
            <Maximize2 className="w-3 h-3" />
          </button>
          <button onClick={() => chartRef.current && exportChartAsPNG(chartRef.current, title || 'chart')} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="PNG">PNG</button>
          <button onClick={() => chartRef.current && exportChartAsPDF(chartRef.current, title || 'chart')} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="PDF">PDF</button>
        </div>
      </div>
      <div
        className="h-[220px] w-full min-w-[260px] overflow-hidden rounded-lg"
        onWheel={zp.onWheel}
        onPointerDown={zp.onPointerDown}
        onPointerMove={zp.onPointerMove}
        onPointerUp={zp.onPointerUp}
      >
        <div style={zp.style} className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Qiymat" />
              </BarChart>
            ) : type === 'line' ? (
              <LineChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Qiymat" />
              </LineChart>
            ) : type === 'area' ? (
              <RechartsArea data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#areaGrad)" strokeWidth={2} name="Qiymat" />
              </RechartsArea>
            ) : type === 'scatter' ? (
              <ScatterChart margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis dataKey="value" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" name="X" />
                <YAxis dataKey="value2" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" name="Y" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Scatter data={data} fill="hsl(var(--primary))" fillOpacity={0.6} />
              </ScatterChart>
            ) : (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [v, 'Soni']} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

// Multi-chart dashboard rendered inline in chat
function InlineDashboard({ charts, onFullscreen }: { charts: AidaChartData[]; onFullscreen?: (chart: AidaChartData) => void }) {
  const dashRef = useRef<HTMLDivElement>(null);
  if (!charts?.length) return null;
  return (
    <motion.div
      ref={dashRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
      className="mt-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <BarChart3 className="w-4 h-4" />
          <span>AIDA Dashboard — {charts.length} ta diagramma</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => dashRef.current && exportChartAsPNG(dashRef.current, 'AIDA_Dashboard')}
            className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          ><Download className="w-3 h-3" /> PNG</button>
          <button
            onClick={() => dashRef.current && exportChartAsPDF(dashRef.current, 'AIDA_Dashboard')}
            className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          ><Download className="w-3 h-3" /> PDF</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {charts.map((chart, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <AidaMessageChart {...chart} onFullscreen={() => onFullscreen?.(chart)} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function AidaAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<AidaState>('sleeping');
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [datasetContext, setDatasetContext] = useState('');
  const [fullscreenChart, setFullscreenChart] = useState<AidaChartData | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [aidaStoredAnalysis, setAidaStoredAnalysis] = useState<DatasetAnalysis | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [alwaysListening, setAlwaysListening] = useState(true);
  const [scribeConnected, setScribeConnected] = useState(false);
  const stateRef = useRef<AidaState>('sleeping');
  const alwaysListeningRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeWordDetectedRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const processQuestionRef = useRef<(q: string) => void>();
  const handleVoiceCommandRef = useRef<(cmd: string) => boolean>();
  const speakGreetingRef = useRef<(text: string) => Promise<void>>();

  // Keep refs in sync with state
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { alwaysListeningRef.current = alwaysListening; }, [alwaysListening]);
  // Voice selection
  const [selectedVoice, setSelectedVoice] = useState('daniel');
  const [voiceSpeed, setVoiceSpeed] = useState(1.15);
  const voiceOptions = [
    { id: 'daniel', name: 'Daniel', label: '🎙️ Daniel (Erkak)', voiceId: 'onwK4e9ZLuTAKqWW03F9' },
    { id: 'laura', name: 'Laura', label: '🎙️ Laura (Ayol)', voiceId: 'FGY2WhTYpPnrIDTdsKH5' },
    { id: 'alice', name: 'Alice', label: '🎙️ Alice (Ayol)', voiceId: 'Xb7hH8MSUJpSbSDYk0k2' },
    { id: 'matilda', name: 'Matilda', label: '🎙️ Matilda (Ayol)', voiceId: 'XrExE9yKIg1WjnnlVkGX' },
    { id: 'santa', name: 'Santa', label: '🎅 Santa', voiceId: 'MDLAMJ0jxkpYkjXbmG4t' },
    { id: 'sarah', name: 'Sarah', label: '🎙️ Sarah (Ayol)', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
  ];
  const currentVoice = voiceOptions.find(v => v.id === selectedVoice) || voiceOptions[0];

  useEffect(() => {
    setTimeout(() => textInputRef.current?.focus(), 500);
  }, []);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('aida_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data) setConversations(data as Conversation[]);
  };

  useEffect(() => {
    if (!activeConversationId || !user) return;
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('aida_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    }
  };

  const createConversation = async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('aida_conversations')
      .insert({ user_id: user.id, title: 'Yangi suhbat', dataset_context: datasetContext || null })
      .select()
      .single();
    if (error || !data) return null;
    const conv = data as Conversation;
    setConversations(prev => [conv, ...prev]);
    setActiveConversationId(conv.id);
    setMessages([]);
    return conv.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    if (!user) return;
    await supabase.from('aida_messages').insert({
      conversation_id: convId,
      user_id: user.id,
      role,
      content,
    });
  };

  const deleteConversation = async (convId: string) => {
    await supabase.from('aida_conversations').delete().eq('id', convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversationId === convId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  // Load dataset context from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('aida_dataset_context');
    if (stored) setDatasetContext(stored);
    const analysis = sessionStorage.getItem('analysis');
    if (analysis) {
      try {
        const parsed = JSON.parse(analysis);
        const ctx = `Dataset: ${parsed.fileName || 'Unknown'}\nRows: ${parsed.rowCount || 0}\nColumns: ${parsed.columns?.join(', ') || 'N/A'}\nSummary: ${JSON.stringify(parsed.summary || {}).slice(0, 2000)}`;
        setDatasetContext(ctx);
      } catch {}
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File upload handler — also auto-generates dashboard charts in chat
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError('');
    try {
      const rawData = await parseFile(file, 0);
      const result = analyzeDataset(rawData);

      // Build rich context for AI
      const colSummary = result.columnInfo.map(c => {
        let desc = `${c.name} (${c.type})`;
        if (c.stats) desc += ` — min:${c.stats.min.toFixed(1)}, max:${c.stats.max.toFixed(1)}, mean:${c.stats.mean.toFixed(1)}, median:${c.stats.median.toFixed(1)}`;
        if (c.topValues?.length) desc += ` — top: ${c.topValues.slice(0, 5).map(t => `${t.value}(${t.count})`).join(', ')}`;
        return desc;
      }).join('\n');

      const ctx = `Dataset: ${file.name}\nRows: ${result.rows}\nColumns: ${result.columns}\nQuality Score: ${result.qualityScore}%\nMissing: ${result.missingPercent}%\nDuplicates removed: ${result.duplicatesRemoved}\n\nColumn details:\n${colSummary}\n\nSample data (first 5 rows):\n${JSON.stringify(result.cleanedData.slice(0, 5), null, 1).slice(0, 3000)}`;

      setDatasetContext(ctx);
      setDatasetName(file.name);
      setAidaStoredAnalysis(result);
      sessionStorage.setItem('aida_dataset_context', ctx);

      // Generate insights
      const insights = generateInsights(result);

      // Auto-generate dashboard charts
      const dashboardCharts = buildAllChartsFromAnalysis(result);

      const summaryMsg = `✅ **Dataset yuklandi: ${file.name}**\n\n📊 **Umumiy ma'lumot:**\n- Qatorlar: **${result.rows}**\n- Ustunlar: **${result.columns}**\n- Sifat balli: **${result.qualityScore}%**\n- Yetishmayotgan: **${result.missingPercent}%**\n- O'chirilgan dublikatlar: **${result.duplicatesRemoved}**\n\n💡 **Avtomatik tahlil:**\n${insights.slice(0, 5).map(i => `- ${i}`).join('\n')}\n\n📈 **Dashboard avtomatik yaratildi — ${dashboardCharts.length} ta diagramma:**`;

      const sysMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: summaryMsg,
        timestamp: new Date(),
        charts: dashboardCharts,
      };
      setMessages(prev => [...prev, sysMsg]);

      toast.success(`${file.name} yuklandi va dashboard yaratildi!`);

      // Speak about what was done
      if (!isMuted) {
        const spokenSummary = `Ma'lumotlar to'plami yuklandi. ${result.rows} qator va ${result.columns} ustun mavjud. Sifat bahosi yuz baldan ${result.qualityScore}. Men ${dashboardCharts.length} ta diagramma yaratdim. Ko'rib chiqishingiz mumkin.`;
        speakResponse(spokenSummary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faylni qayta ishlashda xatolik.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  // --- Voice Commands System ---
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  
  const voiceCommands = [
    { cmd: 'bosh sahifa / uyga qayt', desc: 'Bosh sahifaga o\'tish' },
    { cmd: 'dashboardlar / mening dashboardlarim', desc: 'Dashboardlar sahifasi' },
    { cmd: 'ovozni o\'chir / ovozni yoq', desc: 'Ovozni boshqarish' },
    { cmd: 'yangi suhbat', desc: 'Yangi suhbat boshlash' },
    { cmd: 'dataset yukla', desc: 'Fayl yuklash oynasi' },
    { cmd: 'eksport / hisobotni yukla', desc: 'Suhbatni eksport qilish' },
    { cmd: 'daniel / laura / alice / sarah', desc: 'Ovozni almashtirish' },
    { cmd: 'tezroq / sekinroq', desc: 'Ovoz tezligini o\'zgartirish' },
    { cmd: 'qorong\'u rejim / tungi rejim', desc: 'Qorong\'u temaga o\'tish' },
    { cmd: 'yorug\' rejim / kunduzgi rejim', desc: 'Yorug\' temaga o\'tish' },
    { cmd: 'temani o\'zgartir', desc: 'Temani almashtirish' },
    { cmd: 'jim bo\'l / stop', desc: 'AIDA ni to\'xtatish' },
    { cmd: 'buyruqlar / yordam', desc: 'Bu ro\'yxatni ko\'rsatish' },
  ];

  const handleVoiceCommand = useCallback((cmd: string): boolean => {
    // Navigation commands
    if (cmd.includes('bosh sahifa') || cmd.includes('uyga') || cmd.includes('asosiy sahifa')) {
      speakGreeting('Bosh sahifaga o\'tmoqdamiz');
      setTimeout(() => navigate('/'), 1500);
      return true;
    }
    if (cmd.includes('dashboard') || cmd.includes('mening dashboard')) {
      speakGreeting('Dashboardlar sahifasiga o\'tmoqdamiz');
      setTimeout(() => navigate('/my-dashboards'), 1500);
      return true;
    }
    if (cmd.includes('portfolio') || cmd.includes('loyihalar')) {
      speakGreeting('Portfolio sahifasiga o\'tmoqdamiz');
      setTimeout(() => navigate('/portfolio'), 1500);
      return true;
    }

    // Mute/unmute
    if (cmd.includes('ovozni o\'chir') || cmd.includes('ovozni yop') || cmd.includes('mute')) {
      setIsMuted(true);
      toast.success('Ovoz o\'chirildi');
      return true;
    }
    if (cmd.includes('ovozni yoq') || cmd.includes('unmute') || cmd.includes('ovozni och')) {
      setIsMuted(false);
      speakGreeting('Ovoz yoqildi');
      return true;
    }

    // New conversation
    if (cmd.includes('yangi suhbat') || cmd.includes('yangi chat') || cmd.includes('tozala')) {
      setActiveConversationId(null);
      setMessages([]);
      speakGreeting('Yangi suhbat boshlandi');
      return true;
    }

    // File upload
    if (cmd.includes('dataset yukla') || cmd.includes('fayl yukla') || cmd.includes('ma\'lumot yukla')) {
      fileInputRef.current?.click();
      speakGreeting('Fayl tanlash oynasi ochildi');
      return true;
    }

    // Export — defer to avoid forward reference
    if (cmd.includes('eksport') || cmd.includes('hisobotni yukla') || cmd.includes('saqla')) {
      if (messages.filter(m => m.role !== 'system').length > 0) {
        // Defer export to next tick so exportConversation is defined
        setTimeout(() => {
          try { exportConversation('pdf'); } catch {}
        }, 100);
        speakGreeting('Suhbat PDF formatda eksport qilindi');
      } else {
        speakGreeting('Eksport qilish uchun avval suhbat boshlang');
      }
      return true;
    }

    // Voice change
    const voiceMap: Record<string, string> = {
      'daniel': 'daniel', 'doniyor': 'daniel',
      'laura': 'laura', 'lavra': 'laura',
      'alice': 'alice', 'elis': 'alice',
      'matilda': 'matilda',
      'santa': 'santa',
      'sarah': 'sarah', 'sara': 'sarah',
    };
    for (const [keyword, voiceId] of Object.entries(voiceMap)) {
      if (cmd.includes(keyword)) {
        const voice = voiceOptions.find(v => v.id === voiceId);
        if (voice) {
          setSelectedVoice(voiceId);
          speakGreeting(`Ovoz ${voice.name} ga o'zgartirildi`);
          return true;
        }
      }
    }

    // Speed control
    if (cmd.includes('tezroq') || cmd.includes('tezlikni oshir')) {
      const newSpeed = Math.min(voiceSpeed + 0.1, 1.2);
      setVoiceSpeed(newSpeed);
      speakGreeting(`Tezlik ${newSpeed.toFixed(1)} iks ga oshirildi`);
      return true;
    }
    if (cmd.includes('sekinroq') || cmd.includes('sekin gapirsang') || cmd.includes('tezlikni kamaytir')) {
      const newSpeed = Math.max(voiceSpeed - 0.1, 0.8);
      setVoiceSpeed(newSpeed);
      speakGreeting(`Tezlik ${newSpeed.toFixed(1)} iks ga kamaytirildi`);
      return true;
    }

    // Theme commands
    if (cmd.includes('qorong\'u') || cmd.includes('tungi rejim') || cmd.includes('dark')) {
      document.documentElement.classList.remove('light');
      document.documentElement.style.setProperty('transition', 'background-color 0.5s ease, color 0.4s ease');
      setTimeout(() => document.documentElement.style.removeProperty('transition'), 600);
      speakGreeting('Qorong\'u rejim yoqildi');
      return true;
    }
    if (cmd.includes('yorug\'') || cmd.includes('kunduzgi') || cmd.includes('oq rejim') || cmd.includes('light')) {
      document.documentElement.classList.add('light');
      document.documentElement.style.setProperty('transition', 'background-color 0.5s ease, color 0.4s ease');
      setTimeout(() => document.documentElement.style.removeProperty('transition'), 600);
      speakGreeting('Yorug\' rejim yoqildi');
      return true;
    }
    if (cmd.includes('temani o\'zgartir') || cmd.includes('tema') || cmd.includes('rangni o\'zgartir')) {
      const isDark = !document.documentElement.classList.contains('light');
      if (isDark) {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      document.documentElement.style.setProperty('transition', 'background-color 0.5s ease, color 0.4s ease');
      setTimeout(() => document.documentElement.style.removeProperty('transition'), 600);
      speakGreeting(isDark ? 'Yorug\' rejimga o\'tildi' : 'Qorong\'u rejimga o\'tildi');
      return true;
    }

    // Help / commands list
    if (cmd.includes('buyruqlar') || cmd.includes('yordam') || cmd.includes('nima qila olasan') || cmd.includes('komandalar')) {
      setShowVoiceHelp(true);
      speakGreeting('Ovozli buyruqlar ro\'yxati ochildi.');
      return true;
    }

    return false;
  }, [navigate, voiceSpeed, messages, voiceOptions]);
  handleVoiceCommandRef.current = handleVoiceCommand;

  // --- ElevenLabs Scribe Realtime STT ---
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scribeConnectingRef = useRef(false);

  const doScribeConnect = useCallback(async (scribeInstance: ReturnType<typeof useScribe>) => {
    if (scribeInstance.isConnected || scribeConnectingRef.current) return;
    scribeConnectingRef.current = true;
    try {
      console.log('[Scribe] Requesting STT token...');
      const { data, error: fnError } = await supabase.functions.invoke('aida-stt-token');
      if (fnError || !data?.token) {
        console.error('[Scribe] STT token error:', fnError, data);
        setError('Ovoz tanish xizmati ulanmadi. 5 soniyadan keyin qayta uriniladi...');
        scribeConnectingRef.current = false;
        // Auto retry after 5s
        reconnectTimerRef.current = setTimeout(() => doScribeConnect(scribeRef.current), 5000);
        return;
      }
      console.log('[Scribe] Token received, connecting...');
      await scribeInstance.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('[Scribe] Connected successfully!');
      setScribeConnected(true);
      setError('');
      setState(alwaysListeningRef.current ? 'listening' : 'sleeping');
      if (alwaysListeningRef.current) wakeWordDetectedRef.current = true;
      toast.success('🎙️ ElevenLabs Scribe ulandi — aniq ovoz tanish tayyor!');
    } catch (e) {
      console.error('[Scribe] Connect error:', e);
      setError('Mikrofon ulanmadi. 5 soniyadan keyin qayta uriniladi...');
      // Auto retry after 5s
      reconnectTimerRef.current = setTimeout(() => doScribeConnect(scribeRef.current), 5000);
    } finally {
      scribeConnectingRef.current = false;
    }
  }, []);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: 'vad' as any,
    onConnect: () => {
      console.log('[Scribe] WebSocket connected');
      setScribeConnected(true);
      setError('');
    },
    onDisconnect: () => {
      console.log('[Scribe] Disconnected — scheduling reconnect in 3s...');
      setScribeConnected(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        console.log('[Scribe] Auto-reconnecting...');
        doScribeConnect(scribeRef.current);
      }, 3000);
    },
    onError: (err) => {
      console.error('[Scribe] Error:', err);
    },
    onSessionTimeLimitExceededError: (d) => {
      console.log('[Scribe] Session time limit:', d?.error, '— reconnecting...');
      setScribeConnected(false);
      reconnectTimerRef.current = setTimeout(() => doScribeConnect(scribeRef.current), 1000);
    },
    onInsufficientAudioActivityError: (d) => {
      console.log('[Scribe] Insufficient audio:', d?.error, '— reconnecting...');
      setScribeConnected(false);
      reconnectTimerRef.current = setTimeout(() => doScribeConnect(scribeRef.current), 2000);
    },
    onPartialTranscript: (data) => {
      console.log('[Scribe] Partial:', data.text, '| State:', stateRef.current);
      if (stateRef.current === 'speaking' || stateRef.current === 'thinking') return;
      const partial = (accumulatedTranscriptRef.current + ' ' + data.text).trim();
      setTranscript(partial);
      // Ensure we're in listening state when we receive audio
      if (stateRef.current === 'sleeping') {
        setState('listening');
        wakeWordDetectedRef.current = true;
      }
    },
    onCommittedTranscript: (data) => {
      console.log('[Scribe] Committed:', data.text, '| State:', stateRef.current);
      if (stateRef.current === 'speaking' || stateRef.current === 'thinking') return;
      const text = data.text.trim();
      if (!text) return;

      // Auto-wake when receiving speech
      if (stateRef.current === 'sleeping') {
        setState('listening');
        wakeWordDetectedRef.current = true;
      }

      accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + text).trim();
      setTranscript(accumulatedTranscriptRef.current);

      const lower = accumulatedTranscriptRef.current.toLowerCase();

      // STOP command
      if (lower.includes('jim bo') || lower.includes('aida stop') || lower.includes('stop aida') || lower === 'stop' || lower === 'стоп') {
        wakeWordDetectedRef.current = false;
        accumulatedTranscriptRef.current = '';
        setTranscript('');
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        window.speechSynthesis.cancel();
        setState('sleeping');
        return;
      }

      // Wake word detection
      if (!wakeWordDetectedRef.current) {
        if (lower.includes('aida') || lower.includes('ayda') || lower.includes('эйда') || lower.includes('аида')) {
          wakeWordDetectedRef.current = true;
          accumulatedTranscriptRef.current = '';
          setTranscript('');
          speakGreetingRef.current?.('Salom, men shu yerdaman. Buyuring!');
          return;
        }
        if (alwaysListeningRef.current) {
          wakeWordDetectedRef.current = true;
          setState('listening');
        }
      }

      // Voice commands
      if (wakeWordDetectedRef.current) {
        const cmd = accumulatedTranscriptRef.current.trim().toLowerCase();
        const cleanCmd = cmd.replace(/^(aida|ayda|hey aida|эйда|аида)\s*/i, '').trim();
        if (cleanCmd.length > 0 && handleVoiceCommandRef.current?.(cleanCmd)) {
          wakeWordDetectedRef.current = true;
          accumulatedTranscriptRef.current = '';
          setTranscript('');
          return;
        }
      }

      // Send to AI after silence
      if (wakeWordDetectedRef.current) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const question = accumulatedTranscriptRef.current.trim();
          const cleanQ = question.replace(/^(aida|ayda|hey aida|эйда|аида)\s*/i, '').trim();
          if (cleanQ.length > 2) {
            processQuestionRef.current?.(cleanQ);
          }
          accumulatedTranscriptRef.current = '';
          setTranscript('');
        }, 1200);
      }
    },
  });

  // Keep a ref to scribe
  const scribeRef = useRef(scribe);
  scribeRef.current = scribe;

  // Connect Scribe on mount (with small delay to ensure hook is initialized)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[Scribe] Initial connect attempt...');
      doScribeConnect(scribeRef.current);
    }, 500);
    return () => {
      clearTimeout(timer);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try { scribeRef.current.disconnect(); } catch {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [doScribeConnect]);

  // Reconnect when alwaysListening changes
  useEffect(() => {
    if (alwaysListening) {
      wakeWordDetectedRef.current = true;
      setState('listening');
    } else {
      wakeWordDetectedRef.current = false;
      setState('sleeping');
    }
  }, [alwaysListening]);

  useEffect(() => {
    if (state === 'listening' && !alwaysListening) {
      const autoSleep = setTimeout(() => {
        setState('sleeping');
        wakeWordDetectedRef.current = false;
        accumulatedTranscriptRef.current = '';
      }, 60000);
      return () => clearTimeout(autoSleep);
    }
  }, [state, alwaysListening]);

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content, timestamp: new Date() }]);
  };

  const exportConversation = (format: 'txt' | 'pdf') => {
    const chatMessages = messages.filter(m => m.role !== 'system');
    if (chatMessages.length === 0) return;
    const title = conversations.find(c => c.id === activeConversationId)?.title || 'AIDA Suhbat';
    const date = new Date().toLocaleDateString('uz-UZ');
    if (format === 'txt') {
      let content = `AIDA Suhbat — ${title}\nSana: ${date}\n${'='.repeat(50)}\n\n`;
      chatMessages.forEach(m => {
        const role = m.role === 'user' ? 'Siz' : 'AIDA';
        const time = m.timestamp.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        content += `[${time}] ${role}:\n${m.content}\n\n`;
      });
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aida-suhbat-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AIDA Suhbat</title>
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a1a}
h1{font-size:20px;border-bottom:2px solid #0ea5e9;padding-bottom:8px}
.meta{color:#666;font-size:13px;margin-bottom:24px}
.msg{margin-bottom:16px;padding:12px 16px;border-radius:12px}
.user{background:#0ea5e9;color:white;margin-left:20%}
.assistant{background:#f1f5f9;margin-right:20%}
.role{font-weight:600;font-size:12px;margin-bottom:4px;opacity:0.7}
.time{font-size:11px;opacity:0.5;margin-top:6px}</style></head><body>
<h1>AIDA — AI Data Analyst</h1>
<div class="meta">${title} • ${date}</div>
${chatMessages.map(m => {
        const role = m.role === 'user' ? 'Siz' : 'AIDA';
        const time = m.timestamp.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        return `<div class="msg ${m.role}"><div class="role">${role}</div>${m.content.replace(/\n/g, '<br>')}<div class="time">${time}</div></div>`;
      }).join('')}</body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    }
  };

  const executeToolCall = useCallback((toolCall: { name: string; arguments: Record<string, any> }): { text: string; charts?: AidaChartData[] } => {
    const { name, arguments: args } = toolCall;
    
    switch (name) {
      case 'clean_data': {
        const strategy = args.strategy || 'auto';
        addSystemMessage(`🔧 Ma'lumotlar tozalanmoqda (${strategy} rejim)...`);
        
        if (aidaStoredAnalysis) {
          const a = aidaStoredAnalysis;
          const cleaningDetails = [
            `✅ **Ma'lumotlar tozalandi** (${strategy} rejim)`,
            ``,
            `📋 **Natijalar:**`,
            `- Boshlang'ich qatorlar: **${a.rawRowCount}**`,
            `- Tozalangan qatorlar: **${a.rows}**`,
            `- O'chirilgan dublikatlar: **${a.duplicatesRemoved}**`,
            `- Yetishmayotgan qiymatlar: **${a.missingPercent}%**`,
            `- Sifat balli: **${a.qualityScore}%**`,
          ];
          
          const charts = buildAllChartsFromAnalysis(a);
          toast.success(`Dataset tozalandi va ${charts.length} ta diagramma yaratildi`);
          
          return {
            text: cleaningDetails.join('\n'),
            charts,
          };
        }
        return { text: '⚠ Dataset yuklanmagan. Avval fayl yuklang.' };
      }
      case 'build_dashboard': {
        const mode = args.mode || 'auto';
        addSystemMessage(`🔧 Dashboard qurilmoqda (${mode} rejim)...`);
        
        if (aidaStoredAnalysis) {
          const charts = buildAllChartsFromAnalysis(aidaStoredAnalysis);
          toast.success(`${charts.length} ta diagramma bilan dashboard yaratildi!`);
          
          return {
            text: `📊 **${mode.toUpperCase()} Dashboard yaratildi!**\n\nMen ${charts.length} xil turdagi diagramma yaratdim:\n${charts.map((c, i) => `${i + 1}. ${c.title || c.type}`).join('\n')}`,
            charts,
          };
        }
        return { text: '⚠ Dashboard yaratish uchun avval dataset yuklang.' };
      }
      case 'generate_insights': {
        const focus = args.focus || 'overview';
        addSystemMessage(`🔧 Chuqur tahlil (${focus})...`);
        
        if (aidaStoredAnalysis) {
          const insights = generateInsights(aidaStoredAnalysis);
          const charts = buildAllChartsFromAnalysis(aidaStoredAnalysis).slice(0, 4);
          
          return {
            text: `🧠 **Chuqur tahlil natijasi (${focus}):**\n\n${insights.map(i => `- ${i}`).join('\n')}\n\n📈 **Vizual ko'rsatmalar:**`,
            charts,
          };
        }
        return { text: '⚠ Tahlil qilish uchun dataset yuklanmagan.' };
      }
      case 'export_report': {
        const format = args.format || 'pdf';
        addSystemMessage(`🔧 Eksport (${format})...`);
        if (format === 'txt' || format === 'pdf') {
          exportConversation(format as 'txt' | 'pdf');
          toast.success(`${format.toUpperCase()} formatda eksport qilindi`);
        } else {
          toast.info(`${format.toUpperCase()} eksport hozircha faqat dashboard sahifasida mavjud`);
        }
        return { text: `Hisobot ${format.toUpperCase()} formatda eksport qilindi.` };
      }
      case 'profile_data': {
        addSystemMessage('🔧 Ma\'lumotlar profili...');
        if (aidaStoredAnalysis) {
          const a = aidaStoredAnalysis;
          const numCols = a.columnInfo.filter(c => c.type === 'numeric');
          const catCols = a.columnInfo.filter(c => c.type === 'categorical');
          const dateCols = a.columnInfo.filter(c => c.type === 'datetime');
          
          const profile = [
            `📊 **Dataset profili:**`,
            `- Qatorlar: **${a.rows}** (asl: ${a.rawRowCount})`,
            `- Ustunlar: **${a.columns}**`,
            `  - Raqamli: **${numCols.length}**`,
            `  - Kategorik: **${catCols.length}**`,
            `  - Sana: **${dateCols.length}**`,
            `- Sifat balli: **${a.qualityScore}%**`,
            `- Yetishmayotgan: **${a.missingPercent}%**`,
            ``,
            `📐 **Raqamli ustunlar statistikasi:**`,
            ...numCols.slice(0, 6).map(c => c.stats ? `- **${c.name}**: min=${c.stats.min.toFixed(1)}, max=${c.stats.max.toFixed(1)}, mean=${c.stats.mean.toFixed(1)}, median=${c.stats.median.toFixed(1)}` : `- ${c.name}: N/A`),
          ];

          const charts: AidaChartData[] = [];
          // Quality chart
          charts.push({
            type: 'pie',
            data: [
              { name: 'Sifatli', value: a.qualityScore },
              { name: 'Muammoli', value: 100 - a.qualityScore },
            ],
            title: '🎯 Ma\'lumot sifati',
          });
          // Column types chart
          charts.push({
            type: 'bar',
            data: [
              { name: 'Raqamli', value: numCols.length },
              { name: 'Kategorik', value: catCols.length },
              { name: 'Sana', value: dateCols.length },
              { name: 'Matn', value: a.columnInfo.filter(c => c.type === 'text').length },
            ],
            title: '📊 Ustun turlari',
          });
          
          return { text: profile.join('\n'), charts };
        }
        return { text: '⚠ Dataset yuklanmagan.' };
      }
      case 'navigate_to': {
        const dest = args.destination || 'home';
        const routes: Record<string, string> = {
          dashboard: '/',
          home: '/',
          upload: '/',
          my_dashboards: '/my-dashboards',
          settings: '/',
        };
        toast.info(`${dest} sahifasiga yo'naltirilmoqda...`);
        setTimeout(() => navigate(routes[dest] || '/'), 1000);
        return { text: `${dest} sahifasiga yo'naltirildi.` };
      }
      case 'compare_datasets': {
        const dim = args.dimension || 'unknown';
        const metric = args.metric;
        addSystemMessage(`🔧 Solishtirish (${dim})...`);

        if (aidaStoredAnalysis && aidaStoredAnalysis.cleanedData.length > 0) {
          const data = aidaStoredAnalysis.cleanedData;
          const groups: Record<string, number[]> = {};
          data.forEach(row => {
            const key = String(row[dim] || 'Boshqa');
            const val = metric ? Number(row[metric]) : 1;
            if (!groups[key]) groups[key] = [];
            if (!isNaN(val)) groups[key].push(val);
          });

          const chartData = Object.entries(groups)
            .map(([name, vals]) => ({ name, value: vals.reduce((s, v) => s + v, 0) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 12);

          return {
            text: `📊 **${dim} bo'yicha solishtirish:**\n\n${chartData.map(d => `- **${d.name}**: ${d.value.toLocaleString()}`).join('\n')}`,
            charts: [{ type: 'bar' as const, data: chartData, title: `${dim} — Solishtirish` }],
          };
        }
        return { text: '⚠ Solishtirish uchun dataset yuklanmagan.' };
      }
      default:
        return { text: `⚠ Noma'lum buyruq: ${name}` };
    }
  }, [navigate, exportConversation, aidaStoredAnalysis]);

  const processQuestion = async (question: string) => {
    // STOP buyrug'i — matn orqali ham ishlaydi
    const lower = question.toLowerCase().trim();
    if (lower === 'stop' || lower === 'aida stop' || lower.includes('jim bo') || lower === 'to\'xta' || lower === 'aida jim') {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis.cancel();
      setState('sleeping');
      wakeWordDetectedRef.current = false;
      accumulatedTranscriptRef.current = '';
      setTranscript('');
      return;
    }

    setState('thinking');
    wakeWordDetectedRef.current = false;
    accumulatedTranscriptRef.current = '';
    setTranscript('');

    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) { setError('Suhbat yaratib bo\'lmadi.'); setState('sleeping'); return; }
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(convId, 'user', question);

    try {
      const history = messages.filter(m => m.role !== 'system').slice(-10).map(m => ({ role: m.role, content: m.content }));

      const sMsgId = (Date.now() + 1).toString();
      let streamedContent = '';
      let toolCalls: any[] = [];
      let toolCallChunks: Record<number, { name: string; arguments: string }> = {};

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aida-voice-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ question, datasetContext, conversationHistory: history, stream: true }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Xatolik: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/event-stream') && response.body) {
        setStreamingMsgId(sMsgId);
        const placeholderMsg: Message = { id: sMsgId, role: 'assistant', content: '', timestamp: new Date() };
        setMessages(prev => [...prev, placeholderMsg]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              if (delta.content) {
                streamedContent += delta.content;
                setMessages(prev => prev.map(m => 
                  m.id === sMsgId ? { ...m, content: streamedContent } : m
                ));
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallChunks[idx]) toolCallChunks[idx] = { name: '', arguments: '' };
                  if (tc.function?.name) toolCallChunks[idx].name = tc.function.name;
                  if (tc.function?.arguments) toolCallChunks[idx].arguments += tc.function.arguments;
                }
              }
            } catch { /* skip */ }
          }
        }

        toolCalls = Object.values(toolCallChunks)
          .filter(tc => tc.name)
          .map(tc => ({
            name: tc.name,
            arguments: (() => { try { return JSON.parse(tc.arguments || '{}'); } catch { return {}; } })(),
          }));

      } else {
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        streamedContent = data.answer || '';
        toolCalls = data.toolCalls || [];
        
        const assistantMsg: Message = { id: sMsgId, role: 'assistant', content: streamedContent, timestamp: new Date() };
        setMessages(prev => [...prev, assistantMsg]);
      }

      // Execute tool calls and collect charts
      let allCharts: AidaChartData[] = [];
      if (toolCalls.length > 0) {
        const toolTexts: string[] = [];
        for (const tc of toolCalls) {
          const result = executeToolCall(tc);
          toolTexts.push(result.text);
          if (result.charts) allCharts.push(...result.charts);
        }
        const toolSummary = toolTexts.join('\n\n');
        const fullAnswer = streamedContent
          ? `${streamedContent}\n\n${toolSummary}`
          : toolSummary;
        
        setMessages(prev => prev.map(m => 
          m.id === sMsgId ? { ...m, content: fullAnswer, charts: allCharts.length > 0 ? allCharts : undefined } : m
        ));
        streamedContent = fullAnswer;
      }

      if (!streamedContent) streamedContent = 'Javob olinmadi.';

      // Auto-add chart for analysis requests even without tool calls
      if (allCharts.length === 0) {
        const chartData = aidaStoredAnalysis && isAnalysisRequest(question) ? buildChartFromAnalysis(aidaStoredAnalysis) : undefined;
        if (chartData) {
          setMessages(prev => prev.map(m => m.id === sMsgId ? { ...m, chartData } : m));
        }
      }

      setStreamingMsgId(null);
      await saveMessage(convId, 'assistant', streamedContent);
      if (!isMuted) await speakResponse(streamedContent);

      if (messages.filter(m => m.role === 'user').length === 0) {
        const title = question.slice(0, 60);
        await supabase.from('aida_conversations').update({ title }).eq('id', convId);
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
      }

      setState('listening');
      wakeWordDetectedRef.current = true;
      accumulatedTranscriptRef.current = '';
    } catch (e) {
      console.error('AIDA error:', e);
      setStreamingMsgId(null);
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      setState('sleeping');
    }
  };
  processQuestionRef.current = processQuestion;

  const speakResponse = async (text: string) => {
    if (isMuted) return;
    setState('speaking');
    // Pause recognition during TTS to prevent echo
    // Scribe handles mic automatically — no manual pause needed
    try {
      // Clean text and add natural pauses for human-like speech
      const cleanText = text
        .replace(/[#*_`~\[\]()>|]/g, '')
        .replace(/\n{2,}/g, '... ')   // paragraph breaks → long pause
        .replace(/\n/g, ', ')          // line breaks → short pause
        .replace(/(\d+)\./g, '$1,')    // numbered lists → comma pause
        .replace(/:\s/g, '... ')       // colons → pause for emphasis
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 2000);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aida-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleanText, voiceId: currentVoice.voiceId, speed: voiceSpeed }),
        }
      );
      if (!response.ok) throw new Error('TTS xatolik');
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.fallback) throw new Error(data.reason || 'ElevenLabs fallback');
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(audioUrl);
    } catch (e) {
      console.error('TTS error, falling back to speechSynthesis:', e);
      try {
        const cleanText = text.replace(/[#*_`~\[\]()>|]/g, '').replace(/\n+/g, '. ').slice(0, 2000);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        // Try to find the best available voice for Uzbek/Turkish (similar phonetics)
        const voices = window.speechSynthesis.getVoices();
        const uzVoice = voices.find(v => v.lang.startsWith('uz')) 
          || voices.find(v => v.lang.startsWith('tr'))
          || voices.find(v => v.lang.startsWith('ru'))
          || voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en'))
          || voices[0];
        if (uzVoice) utterance.voice = uzVoice;
        utterance.lang = uzVoice?.lang || 'uz-UZ';
        utterance.rate = voiceSpeed > 1 ? 1.0 : 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      } catch (fallbackErr) {
        console.error('speechSynthesis fallback also failed:', fallbackErr);
      }
    }
    // Resume recognition after speaking
    // Scribe resumes automatically after speaking
  };

  const speakGreeting = async (text: string) => {
    setState('speaking');
    try {
      const cleanText = text.replace(/[#*_`~\[\]()>|]/g, '').replace(/\n{2,}/g, '... ').replace(/\n/g, ', ').trim().slice(0, 500);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aida-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleanText, voiceId: currentVoice.voiceId, speed: voiceSpeed }),
        }
      );
      if (!response.ok) throw new Error('TTS error');
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await response.json();
        if (data.fallback) throw new Error('fallback');
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(audioUrl);
    } catch {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const uzVoice = voices.find(v => v.lang.startsWith('uz')) 
          || voices.find(v => v.lang.startsWith('tr'))
          || voices.find(v => v.lang.startsWith('ru'))
          || voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en'))
          || voices[0];
        if (uzVoice) utterance.voice = uzVoice;
        utterance.lang = uzVoice?.lang || 'uz-UZ';
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      } catch {}
    }
    setState('listening');
    wakeWordDetectedRef.current = true;
    accumulatedTranscriptRef.current = '';
  };
  speakGreetingRef.current = speakGreeting;

  const handleManualActivate = () => {
    if (state === 'sleeping') {
      wakeWordDetectedRef.current = true;
      accumulatedTranscriptRef.current = '';
      if (!scribe.isConnected) doScribeConnect(scribeRef.current);
      speakGreeting('Salom, men shu yerdaman. Nima qilamiz?');
    } else if (state === 'speaking' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setState('listening');
      wakeWordDetectedRef.current = true;
      accumulatedTranscriptRef.current = '';
    }
  };

  const stateConfig = {
    sleeping: { color: 'bg-muted', pulse: false, icon: MicOff, label: 'Uxlash rejimi' },
    listening: { color: 'bg-emerald-500', pulse: true, icon: Mic, label: `Tinglayapman... (${scribe.status}${scribe.isTranscribing ? ' 🔴' : ''})` },
    thinking: { color: 'bg-amber-500', pulse: true, icon: Brain, label: 'Tahlil qilyapman...' },
    speaking: { color: 'bg-primary', pulse: true, icon: Volume2, label: 'Gapirmoqda...' },
  };

  const currentState = stateConfig[state];
  const StateIcon = currentState.icon;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      {showSidebar && (
        <aside className="w-72 border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Suhbatlar</h2>
            <Button variant="ghost" size="icon" onClick={() => { setActiveConversationId(null); setMessages([]); }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  activeConversationId === conv.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveConversationId(conv.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Hali suhbat yo'q</p>
            )}
          </div>
          <div className="p-3 border-t border-border">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {isUploading ? 'Yuklanmoqda...' : 'Dataset yuklash'}
            </Button>
            {datasetName && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500">
                <FileSpreadsheet className="w-3 h-3" />
                <span className="truncate">{datasetName}</span>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">AIDA</h1>
              <p className="text-xs text-muted-foreground">AI Data Analyst • Senior BI Strategist</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => {
                setAlwaysListening(v => {
                  const next = !v;
                  if (next) {
                    wakeWordDetectedRef.current = true;
                    setState('listening');
                  } else {
                    wakeWordDetectedRef.current = false;
                    setState('sleeping');
                  }
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                alwaysListening
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
              title={alwaysListening ? 'To\'g\'ridan-to\'g\'ri tinglash yoqilgan' : 'Wake word rejimi'}
            >
              <Mic className="w-3 h-3" />
              {alwaysListening ? 'Doim tinglaydi' : 'Wake word'}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              {currentState.label}
            </div>
            {messages.filter(m => m.role !== 'system').length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportConversation('txt')}>
                    Matn fayl (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportConversation('pdf')}>
                    PDF fayl (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border">
                  <Volume2 className="w-3.5 h-3.5" />
                  {currentVoice.name} • {voiceSpeed.toFixed(1)}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-popover border-border z-50 p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Ovoz tanlang</p>
                <div className="space-y-1 mb-3">
                  {voiceOptions.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        selectedVoice === v.id
                          ? 'bg-primary/10 text-primary border border-primary/30'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span>{v.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const previewAudio = document.getElementById('voice-preview-audio') as HTMLAudioElement;
                          if (previewAudio && !previewAudio.paused) {
                            previewAudio.pause();
                            previewAudio.currentTime = 0;
                            return;
                          }
                          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aida-tts`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                            },
                            body: JSON.stringify({ text: 'Salom, men AIDA sun\'iy intellekt yordamchisiman.', voiceId: v.voiceId, speed: voiceSpeed }),
                          }).then(r => r.blob()).then(blob => {
                            const url = URL.createObjectURL(blob);
                            let audio = document.getElementById('voice-preview-audio') as HTMLAudioElement;
                            if (!audio) {
                              audio = document.createElement('audio');
                              audio.id = 'voice-preview-audio';
                              document.body.appendChild(audio);
                            }
                            audio.src = url;
                            audio.play();
                          }).catch(() => toast.error('Preview xatolik'));
                        }}
                        className="p-1 rounded-md hover:bg-background transition-colors"
                        title="Ovozni tinglash"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  ))}
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground mb-1.5">Tezlik: {voiceSpeed.toFixed(2)}x</p>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>0.8x</span>
                    <span>1.0x</span>
                    <span>1.2x</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowVoiceHelp(!showVoiceHelp)} className="text-muted-foreground" title="Ovozli buyruqlar">
              <Command className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : msg.role === 'system'
                      ? msg.content.startsWith('🔧') 
                        ? 'bg-accent/10 text-accent text-xs border border-accent/20 flex items-start gap-2'
                        : 'bg-muted text-muted-foreground text-xs italic'
                      : 'bg-card border border-border text-card-foreground'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {/* Single chart (backward compat) */}
                        {msg.chartData && <AidaMessageChart type={msg.chartData.type} data={msg.chartData.data} title={msg.chartData.title} onFullscreen={() => setFullscreenChart(msg.chartData!)} />}
                        {/* Multi-chart dashboard */}
                        {msg.charts && msg.charts.length > 0 && <InlineDashboard charts={msg.charts} onFullscreen={setFullscreenChart} />}
                        {streamingMsgId === msg.id && (
                          <span className="inline-block w-2 h-4 bg-primary/80 ml-0.5 animate-pulse rounded-sm" />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <span className="text-[10px] opacity-50 mt-1 block">
                      {msg.timestamp.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {transcript && state === 'listening' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-primary/20 text-primary border border-primary/30">
                  <p className="text-sm italic">{transcript}</p>
                </div>
              </motion.div>
            )}

            {state === 'thinking' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tahlil qilinmoqda...
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="mx-6 mb-2 flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
              <button onClick={() => setError('')} className="ml-auto text-xs underline">Yopish</button>
            </div>
          )}

          {/* Voice Control with Waveform */}
          <div className="border-t border-border p-6 flex flex-col items-center gap-4">
            <motion.button
              onClick={handleManualActivate}
              className="relative w-[200px] h-[200px] flex items-center justify-center"
              whileTap={{ scale: 0.95 }}
            >
              <div className={`absolute w-24 h-24 rounded-full ${currentState.color} transition-colors`} />
              {currentState.pulse && (
                <>
                  <motion.div
                    className={`absolute w-24 h-24 rounded-full ${currentState.color} opacity-30`}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className={`absolute w-24 h-24 rounded-full ${currentState.color} opacity-20`}
                    animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  />
                </>
              )}
              <WaveformVisualizer state={state} audioRef={audioRef} />
              <StateIcon className="w-10 h-10 text-white relative z-10" />
            </motion.button>

            <p className="text-sm text-muted-foreground text-center">
              {state === 'sleeping' && (alwaysListening ? 'Gapiring — AIDA tinglayapti...' : '"AIDA" deb chaqiring yoki tugmani bosing')}
              {state === 'listening' && 'Savolingizni ayting — 1 soniya kutib javob beraman...'}
              {state === 'thinking' && 'AIDA tahlil qilmoqda...'}
              {state === 'speaking' && 'AIDA javob bermoqda. To\'xtatish uchun bosing.'}
            </p>
            {(state === 'sleeping' || state === 'listening') && (
              <button 
                onClick={() => setShowVoiceHelp(true)} 
                className="text-xs text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1"
              >
                <Command className="w-3 h-3" />
                Ovozli buyruqlar ro'yxati
              </button>
            )}

            <div className={`text-xs px-3 py-1 rounded-full ${
              datasetContext ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
            }`}>
              {datasetContext ? `✓ ${datasetName || 'Dataset ulangan'}` : '○ Dataset yuklanmagan'}
            </div>

            {/* Text input */}
            <div className="relative w-full max-w-lg group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />
              <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-lg group-focus-within:border-primary/50 transition-colors">
                <Sparkles className="w-4 h-4 text-muted-foreground/50 ml-2 mb-2.5 shrink-0" />
                <textarea
                  ref={textInputRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                      e.preventDefault();
                      if (!textInput.trim() || state === 'thinking') return;
                      processQuestion(textInput.trim());
                      setTextInput('');
                    }
                  }}
                  placeholder="Savolingizni yozing yoki 'dashboard qur' deng..."
                  className="flex-1 bg-transparent text-sm resize-none min-h-[36px] max-h-[120px] py-2 focus:outline-none text-foreground placeholder:text-muted-foreground/60 leading-snug"
                  rows={1}
                  disabled={state === 'thinking'}
                />
                <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
                  <Button
                    type="button"
                    size="icon"
                    disabled={state === 'thinking' || !textInput.trim()}
                    className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow disabled:opacity-30 disabled:shadow-none"
                    onClick={() => {
                      if (!textInput.trim() || state === 'thinking') return;
                      processQuestion(textInput.trim());
                      setTextInput('');
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {fullscreenChart && <FullscreenChartModal chart={fullscreenChart} onClose={() => setFullscreenChart(null)} />}
      </AnimatePresence>

      {/* Voice Commands Help Panel */}
      <AnimatePresence>
        {showVoiceHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowVoiceHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Command className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Ovozli buyruqlar</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowVoiceHelp(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-5 space-y-1 max-h-[60vh] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-3">
                  Avval "AIDA" deb chaqiring, keyin buyruqni ayting
                </p>
                {voiceCommands.map((vc, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-mono shrink-0 mt-0.5">
                      {vc.cmd.split(' / ')[0]}
                    </code>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{vc.desc}</p>
                      {vc.cmd.includes(' / ') && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Boshqa variantlar: {vc.cmd.split(' / ').slice(1).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  💡 Tanilmagan buyruqlar AIDA ga savol sifatida yuboriladi
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
