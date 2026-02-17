import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LayoutGrid, Maximize2, Save, GripVertical, Loader2, Check, Link2, Globe, Lock, Image, FileText, Download, BarChart2, Database, Columns3, ShieldCheck, AlertTriangle, CopyMinus, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart, Bar, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import { TEMPLATES, autoBindColumns, type TemplateId, type SlotBinding } from '@/lib/dashboardTemplates';
import { getCorrelationMatrix } from '@/lib/dataProcessor';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { exportDashboardAsPNG, exportDashboardAsPDF, exportDashboardReport } from '@/lib/exportDashboard';
import { exportAsCSV, exportAsJSON, exportAsExcel } from '@/lib/exportData';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import CodeView from './CodeView';
import DataSourceBadge from './DataSourceBadge';

const COLORS = ['#4472C4', '#ED7D31', '#70AD47', '#FFC000', '#5B9BD5', '#A5A5A5', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444'];

const tooltipContentStyle = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#374151', fontSize: '12px' };

interface TemplateDashboardProps {
  analysis: DatasetAnalysis;
  templateId: TemplateId;
  fileName: string;
  onBack: () => void;
  onSwitchTemplate: () => void;
  onFullDashboard: () => void;
  initialChartOrder?: string[];
}

export default function TemplateDashboard({ analysis, templateId, fileName, onBack, onSwitchTemplate, onFullDashboard, initialChartOrder }: TemplateDashboardProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const bindings = useMemo(() => autoBindColumns(template, analysis), [template, analysis]);

  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric');
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');

  const kpiSlots = template.slots.filter(s => s.type === 'kpi');
  const defaultChartSlots = template.slots.filter(s => s.type !== 'kpi');

  // Drag-and-drop chart order state
  const [chartOrder, setChartOrder] = useState<string[]>(() => {
    if (initialChartOrder && initialChartOrder.length > 0) return initialChartOrder;
    return defaultChartSlots.map(s => s.id);
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Save state
  const [saveName, setSaveName] = useState(fileName);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);

  const orderedChartSlots = useMemo(() => {
    return chartOrder
      .map(id => defaultChartSlots.find(s => s.id === id))
      .filter(Boolean) as typeof defaultChartSlots;
  }, [chartOrder, defaultChartSlots]);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    setChartOrder(prev => {
      const fromIdx = prev.indexOf(draggedId);
      const toIdx = prev.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggedId);
      return next;
    });
  }, [draggedId]);
  const handleDragEnd = () => setDraggedId(null);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('dashboard_configs').insert([{
        user_id: user.id,
        name: saveName || fileName,
        is_public: isPublic,
        config: JSON.parse(JSON.stringify({ chartOrder })),
        file_name: fileName,
        analysis_data: JSON.parse(JSON.stringify(analysis)),
        template_id: templateId,
        chart_order: JSON.parse(JSON.stringify(chartOrder)),
      }]).select('share_token').single();

      if (error) throw error;
      const url = `${window.location.origin}/shared/${data.share_token}`;
      setShareUrl(url);
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useKeyboardShortcuts({
    onUpload: onBack,
    onExport: () => exportDashboardAsPNG('template-dashboard-export', fileName),
    onSave: () => handleSave(),
  });

  const qualityGood = analysis.qualityScore >= 85;
  const qualityWarn = analysis.qualityScore >= 60 && !qualityGood;
  const qualityBad = !qualityGood && !qualityWarn;

  const getKPIValue = (slotId: string): { label: string; value: string; icon?: typeof Database; color?: string; borderColor?: string; special?: boolean } => {
    const slot = template.slots.find(s => s.id === slotId)!;
    const base = { label: slot.label, value: '—' };
    switch (slotId) {
      case 'kpi_rows':
        return { ...base, value: analysis.rows.toLocaleString(), icon: Database, color: 'from-[hsl(190,85%,48%)]/20 to-[hsl(190,85%,48%)]/5', borderColor: 'border-[hsl(190,85%,48%)]/40' };
      case 'kpi_cols':
        return { ...base, value: String(analysis.columns), icon: Columns3, color: 'from-[hsl(160,65%,42%)]/20 to-[hsl(160,65%,42%)]/5', borderColor: 'border-[hsl(160,65%,42%)]/40' };
      case 'kpi_quality':
        return { ...base, value: `${analysis.qualityScore}/100`, icon: ShieldCheck, color: qualityGood ? 'from-[hsl(160,65%,42%)]/30 to-[hsl(160,65%,42%)]/5' : qualityWarn ? 'from-[hsl(35,90%,55%)]/30 to-[hsl(35,90%,55%)]/5' : 'from-destructive/20 to-destructive/5', borderColor: qualityGood ? 'border-[hsl(160,65%,42%)]/50' : qualityWarn ? 'border-[hsl(35,90%,55%)]/50' : 'border-destructive/40', special: true };
      case 'kpi_missing':
        return { ...base, value: `${Number(analysis.missingPercent.toFixed(1))}%`, icon: AlertTriangle, color: 'from-[hsl(35,90%,55%)]/20 to-[hsl(35,90%,55%)]/5', borderColor: 'border-[hsl(35,90%,55%)]/40' };
      case 'kpi_dups':
        return { ...base, value: String(analysis.duplicatesRemoved), icon: CopyMinus, color: 'from-[hsl(280,65%,60%)]/20 to-[hsl(280,65%,60%)]/5', borderColor: 'border-[hsl(280,65%,60%)]/40' };
      case 'kpi_date':
        return { ...base, value: analysis.dateRange ? `${analysis.dateRange.min} → ${analysis.dateRange.max}` : '—', icon: Calendar, color: 'from-[hsl(350,70%,55%)]/20 to-[hsl(350,70%,55%)]/5', borderColor: 'border-[hsl(350,70%,55%)]/40' };
      case 'kpi_total': {
        const col = bindingCol(slotId);
        if (!col?.stats) return base;
        const sum = analysis.cleanedData.reduce((a, r) => {
          const v = r[col!.name];
          const n = typeof v === 'number' && !isNaN(v) ? v : Number(v);
          return a + (isNaN(n) ? 0 : n);
        }, 0);
        return { ...base, value: sum.toLocaleString(undefined, { maximumFractionDigits: 2 }), icon: TrendingUp, color: 'from-[hsl(190,85%,48%)]/20 to-[hsl(190,85%,48%)]/5', borderColor: 'border-[hsl(190,85%,48%)]/40' };
      }
      case 'kpi_avg': {
        const col = bindingCol(slotId);
        if (!col?.stats) return base;
        const mean = col.stats.mean;
        const frac = Number.isInteger(mean) ? 0 : 2;
        return { ...base, value: mean.toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac }), icon: TrendingUp, color: 'from-[hsl(160,65%,42%)]/20 to-[hsl(160,65%,42%)]/5', borderColor: 'border-[hsl(160,65%,42%)]/40' };
      }
      default:
        return base;
    }
  };

  function bindingCol(slotId: string) {
    const b = bindings.find(x => x.slotId === slotId);
    if (b?.column) return numCols.find(c => c.name === b.column) ?? numCols[0];
    return numCols[0];
  }

  const renderChart = (slot: typeof defaultChartSlots[0], binding: SlotBinding) => {
    const hasRequired = slot.requires.every(req => {
      if (req === 'numeric') return numCols.length > 0;
      if (req === 'categorical') return catCols.length > 0;
      if (req === 'datetime') return dateCols.length > 0;
      return true;
    });

    if (!hasRequired) {
      return (
        <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4 text-center">
          {t('templates.noData')}: {slot.requires.join(' + ')}
        </div>
      );
    }

    switch (slot.type) {
      case 'bar': {
        const col = binding.column ? catCols.find(c => c.name === binding.column) ?? catCols[0] : catCols[0];
        if (!col?.topValues) return null;
        const data = col.topValues.slice(0, 10);
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" vertical={false} />
              <XAxis dataKey="value" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} width={36} />
              <Tooltip contentStyle={tooltipContentStyle} formatter={(v: number) => [v.toLocaleString(), col.name]} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} strokeWidth={1} stroke="rgba(255,255,255,0.1)">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                <LabelList dataKey="count" position="top" fill="hsl(215, 12%, 65%)" fontSize={11} formatter={(v: number) => v.toLocaleString()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case 'line': {
        const dateCol = dateCols[0];
        const numCol = binding.column ? numCols.find(c => c.name === binding.column) ?? numCols[0] : numCols[0];
        if (!dateCol || !numCol) return null;
        const grouped: Record<string, number> = {};
        analysis.cleanedData.forEach(row => {
          const d = new Date(String(row[dateCol.name]));
          if (isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          grouped[key] = (grouped[key] || 0) + (Number(row[numCol.name]) || 0);
        });
        const data = Object.entries(grouped).sort().map(([date, value]) => ({ date, value }));
        return (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
              <defs><linearGradient id={`grad-tpl-${slot.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(190, 85%, 48%)" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(190, 85%, 48%)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} width={40} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
              <Tooltip contentStyle={tooltipContentStyle} formatter={(v: number) => [v.toLocaleString(undefined, { maximumFractionDigits: 0 }), numCol.name]} />
              <Area type="monotone" dataKey="value" stroke="hsl(190, 85%, 48%)" strokeWidth={2} fill={`url(#grad-tpl-${slot.id})`} dot={{ fill: 'hsl(190, 85%, 48%)', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: 'hsl(190, 85%, 48%)', stroke: 'hsl(210, 20%, 92%)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      case 'pie': {
        const col = binding.column ? catCols.find(c => c.name === binding.column) ?? (catCols.length > 1 ? catCols[1] : catCols[0]) : (catCols.length > 1 ? catCols[1] : catCols[0]);
        if (!col?.topValues) return null;
        const data = col.topValues.slice(0, 8);
        const total = data.reduce((a, d) => a + d.count, 0);
        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="value" cx="50%" cy="50%" outerRadius={85} strokeWidth={2} stroke="hsl(220, 15%, 12%)">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                <LabelList dataKey="value" position="outside" fill="hsl(215, 12%, 70%)" fontSize={11} formatter={(v: string, _n: string, entry?: { payload?: { count: number } }) => {
                  const cnt = entry?.payload?.count ?? 0;
                  return `${v} (${total ? ((cnt / total) * 100).toFixed(0) : 0}%)`;
                }} />
              </Pie>
              <Tooltip contentStyle={tooltipContentStyle} formatter={(v: number) => [v.toLocaleString(), col.name]} />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      case 'histogram': {
        const col = binding.column ? numCols.find(c => c.name === binding.column) ?? numCols[0] : numCols[0];
        if (!col?.stats) return null;
        const vals = analysis.cleanedData.map(r => Number(r[col.name])).filter(n => !isNaN(n));
        const bins = Math.min(15, Math.max(5, Math.floor(Math.sqrt(vals.length))));
        const min = col.stats.min, max = col.stats.max;
        const step = (max - min) / bins || 1;
        const histogram = Array.from({ length: bins }, (_, i) => {
          const lo = min + i * step, hi = i === bins - 1 ? max + 0.001 : lo + step;
          return { range: max > 1000 ? `${(lo/1000).toFixed(1)}k` : lo.toFixed(0), count: vals.filter(v => v >= lo && v < hi).length };
        });
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={histogram} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} interval={Math.max(0, Math.floor(bins/6))} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} width={36} />
              <Tooltip contentStyle={tooltipContentStyle} formatter={(v: number) => [v.toLocaleString(), col.name]} labelFormatter={(l) => `Oraliqi: ${l}`} />
              <Bar dataKey="count" fill="hsl(160, 65%, 42%)" radius={[6, 6, 0, 0]} strokeWidth={1} stroke="rgba(255,255,255,0.15)">
                <LabelList dataKey="count" position="top" fill="hsl(215, 12%, 65%)" fontSize={10} formatter={(v: number) => v > 0 ? v : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case 'missing': {
        const data = analysis.columnInfo
          .filter(c => c.missingPercent > 0)
          .sort((a, b) => b.missingPercent - a.missingPercent)
          .slice(0, 12)
          .map(c => ({ name: c.name, missing: +c.missingPercent.toFixed(1) }));
        if (data.length === 0) return <div className="flex items-center justify-center h-[240px] text-xs text-muted-foreground">{t('templates.noMissing')}</div>;
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} width={90} />
              <Tooltip contentStyle={tooltipContentStyle} formatter={(v: number) => [`${v}%`, t('kpi.missing')]} />
              <Bar dataKey="missing" fill="hsl(0, 72%, 51%)" radius={[0, 6, 6, 0]} strokeWidth={1} stroke="rgba(255,255,255,0.1)">
                <LabelList dataKey="missing" position="right" fill="hsl(215, 12%, 65%)" fontSize={10} formatter={(v: number) => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case 'heatmap': {
        if (numCols.length < 2) return null;
        const cols = numCols.slice(0, 6).map(c => c.name);
        const { matrix } = getCorrelationMatrix(analysis.cleanedData, cols);
        return (
          <div className="grid gap-px p-2" style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)` }}>
            <div />
            {cols.map(c => <div key={c} className="text-[9px] text-muted-foreground text-center truncate px-1">{c}</div>)}
            {matrix.map((row, i) => (
              <div key={`row-${i}`} className="contents">
                <div className="text-[9px] text-muted-foreground truncate pr-1 flex items-center">{cols[i]}</div>
                {row.map((val, j) => (
                  <div
                    key={`${i}-${j}`}
                    className="aspect-square rounded-sm flex items-center justify-center text-[9px] data-font"
                    style={{
                      backgroundColor: val > 0
                        ? `hsla(190, 85%, 48%, ${Math.abs(val) * 0.6})`
                        : `hsla(0, 72%, 51%, ${Math.abs(val) * 0.6})`,
                      color: Math.abs(val) > 0.3 ? 'white' : 'hsl(215, 12%, 50%)',
                    }}
                  >
                    {val.toFixed(1)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div id="template-dashboard-export" className="min-h-screen bg-[#e8e9eb]">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-30 executive-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-lg" aria-label="Orqaga"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate flex items-center gap-2">
              <span className="text-lg">{template.icon}</span>
              <span>{template.name}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{fileName} · {analysis.rows.toLocaleString()} {t('table.rows')} · {t('header.quality')}: {analysis.qualityScore}/100</p>
              <DataSourceBadge fileName={fileName} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button variant="default" size="sm" onClick={onFullDashboard} className="text-[10px] sm:text-xs h-8 sm:h-9 gap-1.5 bg-primary hover:bg-primary/90 shadow-sm">
              <Maximize2 className="w-3.5 h-3.5" /> <span>{t('templates.fullDashboard')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onSwitchTemplate} className="text-[10px] sm:text-xs h-8 sm:h-9 gap-1">
              <LayoutGrid className="w-3 h-3" /> <span className="hidden sm:inline">{t('templates.switch')}</span>
            </Button>
            <div className="h-6 w-px bg-border/60 hidden sm:block" />
            <Button variant="outline" size="sm" onClick={() => exportDashboardAsPNG('template-dashboard-export', fileName)} className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 gap-1" title="PNG sifatida saqlash">
              <Image className="w-3 h-3" /> <span className="hidden sm:inline">PNG</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportDashboardAsPDF('template-dashboard-export', fileName)} className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 gap-1" title="PDF sifatida chop qilish">
              <FileText className="w-3 h-3" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportDashboardReport(analysis, fileName)} className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 gap-1" title="Hisobot yuklash">
              <BarChart2 className="w-3 h-3" /> <span className="hidden sm:inline">Hisobot</span>
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowDataExport(!showDataExport)} className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 gap-1">
                <Download className="w-3 h-3" /> <span className="hidden sm:inline">Data</span>
              </Button>
              {showDataExport && (
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                  <button onClick={() => { exportAsCSV(analysis.cleanedData, fileName); setShowDataExport(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors">CSV</button>
                  <button onClick={() => { exportAsJSON(analysis.cleanedData, fileName); setShowDataExport(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors">JSON</button>
                  <button onClick={() => { exportAsExcel(analysis.cleanedData, fileName); setShowDataExport(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors">Excel</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save & Share bar */}
        {user && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2 sm:pb-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder={t('save.name')} className="h-7 sm:h-8 text-[10px] sm:text-xs w-28 sm:w-40 bg-secondary border-border" />
            <Button variant="ghost" size="sm" onClick={() => setIsPublic(!isPublic)} className="text-xs gap-1">
              {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isPublic ? t('save.public') : t('save.private')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
              {t('save.dashboard')}
            </Button>
            {shareUrl && (
              <Button variant="ghost" size="sm" onClick={copyLink} className="text-xs gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                {copied ? t('save.copied') : t('save.copyLink')}
              </Button>
            )}
          </div>
        )}
      </motion.header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* KPI Cards — Professional data analyst style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {kpiSlots.map((slot, i) => {
            const k = getKPIValue(slot.id);
            const Icon = k.icon;
            const valueColor = k.special ? (qualityGood ? 'text-[hsl(160,65%,42%)]' : qualityWarn ? 'text-[hsl(35,90%,55%)]' : 'text-destructive') : 'text-foreground';
            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className={`rounded-xl border bg-gradient-to-br ${k.color || 'from-secondary/50 to-secondary/20'} ${k.borderColor || 'border-border/40'} p-4 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {Icon && <div className="w-8 h-8 rounded-lg bg-background/40 flex items-center justify-center"><Icon className={`w-4 h-4 ${k.special ? valueColor : 'text-foreground/80'}`} /></div>}
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">{k.label}</span>
                </div>
                <p className={`font-bold text-xl sm:text-2xl tracking-tight tabular-nums ${valueColor}`}>{k.value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Drag hint */}
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <GripVertical className="w-3 h-3" /> {t('templates.dragHint')}
        </p>

        {/* Chart Grid — draggable, professional cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {orderedChartSlots.map((slot, i) => {
            const binding = bindings.find(b => b.slotId === slot.id) || { slotId: slot.id };
            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                draggable
                onDragStart={() => handleDragStart(slot.id)}
                onDragOver={(e) => handleDragOver(e, slot.id)}
                onDragEnd={handleDragEnd}
                className={`rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all cursor-grab active:cursor-grabbing ${
                  draggedId === slot.id ? 'opacity-60 ring-2 ring-primary/50 scale-[0.99]' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">{slot.label}</h3>
                </div>
                <div className="min-h-[200px]">{renderChart(slot, binding)}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Code View — Python, SQL, Power BI */}
        <CodeView analysis={analysis} fileName={fileName} />
      </main>
    </div>
  );
}
