import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LayoutGrid, Maximize2, Save, GripVertical, Loader2, Check, Link2, Globe, Lock, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import { TEMPLATES, autoBindColumns, type TemplateId, type SlotBinding } from '@/lib/dashboardTemplates';
import { getCorrelationMatrix } from '@/lib/dataProcessor';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { exportDashboardAsPNG, exportDashboardAsPDF } from '@/lib/exportDashboard';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const COLORS = [
  'hsl(190, 85%, 48%)', 'hsl(160, 65%, 42%)', 'hsl(35, 90%, 55%)',
  'hsl(280, 65%, 60%)', 'hsl(350, 70%, 55%)', 'hsl(120, 50%, 45%)',
  'hsl(200, 70%, 55%)', 'hsl(30, 80%, 50%)', 'hsl(260, 55%, 55%)', 'hsl(10, 70%, 50%)',
];

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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUpload: onBack,
    onExport: () => exportDashboardAsPNG('template-dashboard-export', fileName),
    onSave: () => handleSave(),
  });

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

  const getKPIValue = (slotId: string): { label: string; value: string } => {
    const slot = template.slots.find(s => s.id === slotId)!;
    switch (slotId) {
      case 'kpi_rows': return { label: slot.label, value: analysis.rows.toLocaleString() };
      case 'kpi_cols': return { label: slot.label, value: String(analysis.columns) };
      case 'kpi_quality': return { label: slot.label, value: `${analysis.qualityScore}/100` };
      case 'kpi_missing': return { label: slot.label, value: `${analysis.missingPercent}%` };
      case 'kpi_dups': return { label: slot.label, value: String(analysis.duplicatesRemoved) };
      case 'kpi_date': return { label: slot.label, value: analysis.dateRange ? `${analysis.dateRange.min} → ${analysis.dateRange.max}` : 'N/A' };
      case 'kpi_total': {
        const col = numCols[0];
        if (!col?.stats) return { label: slot.label, value: 'N/A' };
        const sum = analysis.cleanedData.reduce((a, r) => a + (Number(r[col.name]) || 0), 0);
        return { label: slot.label, value: sum.toLocaleString(undefined, { maximumFractionDigits: 0 }) };
      }
      case 'kpi_avg': {
        const col = numCols[0];
        return { label: slot.label, value: col?.stats ? col.stats.mean.toFixed(1) : 'N/A' };
      }
      default: return { label: slot.label, value: '—' };
    }
  };

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
        const col = catCols[0];
        if (!col?.topValues) return null;
        const data = col.topValues.slice(0, 10);
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
              <XAxis dataKey="value" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case 'line': {
        const dateCol = dateCols[0];
        const numCol = numCols[0];
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
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <defs><linearGradient id={`grad-${slot.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(190, 85%, 48%)" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(190, 85%, 48%)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="value" stroke="hsl(190, 85%, 48%)" fill={`url(#grad-${slot.id})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      case 'pie': {
        const col = catCols.length > 1 ? catCols[1] : catCols[0];
        if (!col?.topValues) return null;
        const data = col.topValues.slice(0, 8);
        return (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="value" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      case 'histogram': {
        const col = binding.column ? numCols.find(c => c.name === binding.column) : numCols[0];
        if (!col?.stats) return null;
        const vals = analysis.cleanedData.map(r => Number(r[col.name])).filter(n => !isNaN(n));
        const bins = 15;
        const min = col.stats.min, max = col.stats.max;
        const step = (max - min) / bins || 1;
        const histogram = Array.from({ length: bins }, (_, i) => {
          const lo = min + i * step, hi = lo + step;
          return { range: `${lo.toFixed(0)}`, count: vals.filter(v => v >= lo && (i === bins - 1 ? v <= hi : v < hi)).length };
        });
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={histogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
              <XAxis dataKey="range" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 9 }} interval={2} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(160, 65%, 42%)" radius={[3, 3, 0, 0]} />
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
        if (data.length === 0) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{t('templates.noMissing')}</div>;
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
              <XAxis type="number" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="missing" fill="hsl(0, 72%, 51%)" radius={[0, 3, 3, 0]} />
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
    <div id="template-dashboard-export" className="min-h-screen bg-mesh">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate flex items-center gap-2">
              <span>{template.icon}</span>
              <span>{template.name}</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{fileName} · {analysis.rows.toLocaleString()} {t('table.rows')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onSwitchTemplate} className="text-xs gap-1">
            <LayoutGrid className="w-3 h-3" /> <span className="hidden sm:inline">{t('templates.switch')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onFullDashboard} className="text-xs gap-1">
            <Maximize2 className="w-3 h-3" /> <span className="hidden sm:inline">{t('templates.fullDashboard')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportDashboardAsPNG('template-dashboard-export', fileName)} className="text-xs gap-1">
            <Image className="w-3 h-3" /> <span className="hidden sm:inline">PNG</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportDashboardAsPDF('template-dashboard-export', fileName)} className="text-xs gap-1">
            <FileText className="w-3 h-3" /> <span className="hidden sm:inline">PDF</span>
          </Button>
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
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {kpiSlots.map((slot, i) => {
            const { label, value } = getKPIValue(slot.id);
            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-3 sm:p-4 text-center"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="text-lg sm:text-xl font-bold text-foreground data-font">{value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Drag hint */}
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <GripVertical className="w-3 h-3" /> {t('templates.dragHint')}
        </p>

        {/* Chart Grid — draggable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orderedChartSlots.map((slot, i) => {
            const binding = bindings.find(b => b.slotId === slot.id) || { slotId: slot.id };
            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                draggable
                onDragStart={() => handleDragStart(slot.id)}
                onDragOver={(e) => handleDragOver(e, slot.id)}
                onDragEnd={handleDragEnd}
                className={`glass-card p-4 cursor-grab active:cursor-grabbing transition-all ${
                  draggedId === slot.id ? 'opacity-50 ring-2 ring-primary scale-[0.98]' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{slot.label}</h3>
                </div>
                {renderChart(slot, binding)}
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
