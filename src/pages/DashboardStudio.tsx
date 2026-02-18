import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, AlertCircle, Loader2, ChevronDown, Filter, Image, FileText,
  Download, Save, Link2, Check, Globe, Lock, Sparkles, Zap, BarChart3, TrendingUp,
  Brain, Target, Layers3, ArrowLeft, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PlatformLayout from '@/components/layout/PlatformLayout';
import KPICards from '@/components/dashboard/KPICards';
import KPICardsSkeleton from '@/components/dashboard/KPICardsSkeleton';
import ChartViewToggle from '@/components/dashboard/ChartViewToggle';
import ChartSkeleton from '@/components/dashboard/ChartSkeleton';
import DataTable from '@/components/dashboard/DataTable';
import InsightsPanel from '@/components/dashboard/InsightsPanel';
import IntelligentKPICards from '@/components/dashboard/IntelligentKPICards';
import AnomalyDetectionPanel from '@/components/dashboard/AnomalyDetectionPanel';
import TrendComparisonChart from '@/components/dashboard/TrendComparisonChart';
import PredictiveForecasting from '@/components/dashboard/PredictiveForecasting';
import CorrelationHeatmap from '@/components/dashboard/CorrelationHeatmap';
import CohortFunnelAnalysis from '@/components/dashboard/CohortFunnelAnalysis';
import ChurnRiskPanel from '@/components/dashboard/ChurnRiskPanel';
import WhatIfSimulation from '@/components/dashboard/WhatIfSimulation';
import CodeView from '@/components/dashboard/CodeView';
import AiAgentChat from '@/components/dashboard/AiAgentChat';
import ExecutiveSummaryPanel from '@/components/dashboard/ExecutiveSummaryPanel';
import NaturalLanguageQuery from '@/components/dashboard/NaturalLanguageQuery';
import ExecutiveReportGenerator from '@/components/dashboard/ExecutiveReportGenerator';
import DataSourceBadge from '@/components/dashboard/DataSourceBadge';
import { getSheetNames, parseFile, analyzeDataset } from '@/lib/dataProcessor';
import { exportDashboardAsPNG, exportDashboardAsPDF } from '@/lib/exportDashboard';
import { exportAsCSV, exportAsJSON, exportAsExcel } from '@/lib/exportData';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

const ACCEPTED = ['.csv', '.xlsx', '.xls', '.json', '.sql'];
const MAX_SIZE = 25 * 1024 * 1024;

const MODE_CONFIG: Record<string, { icon: React.ElementType; color: string; gradient: string }> = {
  Finance: { icon: TrendingUp, color: 'text-accent', gradient: 'from-accent/20 to-accent/5' },
  Product: { icon: Target, color: 'text-primary', gradient: 'from-primary/20 to-primary/5' },
  'AI / ML': { icon: Brain, color: 'text-chart-3', gradient: 'from-chart-3/20 to-chart-3/5' },
  Growth: { icon: Layers3, color: 'text-chart-4', gradient: 'from-chart-4/20 to-chart-4/5' },
  Explorer: { icon: BarChart3, color: 'text-chart-5', gradient: 'from-chart-5/20 to-chart-5/5' },
};

function detectBusinessMode(analysis: DatasetAnalysis): string {
  const colNames = analysis.columnInfo.map(c => c.name.toLowerCase());
  if (colNames.some(n => n.includes('revenue') || n.includes('income')) && colNames.some(n => n.includes('cost') || n.includes('expense')))
    return 'Finance';
  if (colNames.some(n => n.includes('user_id') || n.includes('userid')) && colNames.some(n => n.includes('date')))
    return 'Product';
  if (colNames.some(n => n.includes('token') || n.includes('latency')))
    return 'AI / ML';
  if (colNames.some(n => n.includes('marketing') || n.includes('channel') || n.includes('campaign')))
    return 'Growth';
  return 'Explorer';
}

export default function DashboardStudioPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const studioData = (() => {
    try {
      const raw = sessionStorage.getItem('studio_analysis');
      if (raw) { sessionStorage.removeItem('studio_analysis'); return JSON.parse(raw); }
    } catch {}
    return null;
  })();

  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(studioData?.analysis ?? null);
  const [fileName, setFileName] = useState(studioData?.fileName ?? '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(!!studioData?.analysis);

  const [showFilters, setShowFilters] = useState(false);
  const [catFilters, setCatFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [numFilter, setNumFilter] = useState<{ col: string; min: number; max: number } | null>(null);

  const [saveName, setSaveName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (isLoading) { const timer = setTimeout(() => setIsLoading(false), 800); return () => clearTimeout(timer); }
  }, [isLoading]);

  useEffect(() => {
    if (analysis) { setDateFrom(analysis.dateRange?.min || ''); setDateTo(analysis.dateRange?.max || ''); setSaveName(fileName); }
  }, [analysis, fileName]);

  const businessMode = analysis ? detectBusinessMode(analysis) : '';
  const modeConfig = MODE_CONFIG[businessMode] || MODE_CONFIG.Explorer;

  const dateCol = analysis?.columnInfo.find(c => c.type === 'datetime');
  const numCols = analysis?.columnInfo.filter(c => c.type === 'numeric' && c.stats) ?? [];
  const catCols = analysis?.columnInfo.filter(c => c.type === 'categorical' && c.topValues && c.topValues.length <= 20) ?? [];

  const filteredData = analysis ? analysis.cleanedData.filter(row => {
    const catPass = Object.entries(catFilters).every(([col, val]) => !val || String(row[col]) === val);
    if (!catPass) return false;
    if (dateCol && (dateFrom || dateTo)) {
      const d = new Date(String(row[dateCol.name]));
      if (!isNaN(d.getTime())) {
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      }
    }
    if (numFilter) {
      const v = Number(row[numFilter.col]);
      if (!isNaN(v) && (v < numFilter.min || v > numFilter.max)) return false;
    }
    return true;
  }) : [];

  const numericColNames = numCols.map(c => c.name);

  const validateFile = useCallback(async (f: File) => {
    setError('');
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) { setError(t('upload.error.type')); return; }
    if (f.size > MAX_SIZE) { setError(t('upload.error.size')); return; }
    setFile(f); setSheetIndex(0);
    if (ext === '.xlsx' || ext === '.xls') {
      try { const names = await getSheetNames(f); setSheets(names); } catch { setSheets([]); }
    } else { setSheets([]); }
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) validateFile(e.dataTransfer.files[0]);
  }, [validateFile]);

  const processFile = async () => {
    if (!file) return;
    setIsProcessing(true); setError('');
    try {
      const rawData = await parseFile(file, sheetIndex);
      const result = analyzeDataset(rawData);
      setAnalysis(result); setFileName(file.name); setIsLoading(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process file.');
    } finally { setIsProcessing(false); }
  };

  const clearAllFilters = () => {
    setCatFilters({}); setDateFrom(analysis?.dateRange?.min || ''); setDateTo(analysis?.dateRange?.max || ''); setNumFilter(null);
  };

  const handleSave = async () => {
    if (!user || !analysis) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('dashboard_configs').insert([{
        user_id: user.id, name: saveName || fileName, is_public: isPublic,
        config: JSON.parse(JSON.stringify({ catFilters })),
        file_name: fileName, analysis_data: JSON.parse(JSON.stringify(analysis)),
      }]).select('share_token').single();
      if (error) throw error;
      setShareUrl(`${window.location.origin}/shared/${data.share_token}`);
    } catch (e) { console.error('Save error:', e); } finally { setSaving(false); }
  };

  const copyLink = () => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const generateAiSummary = async () => {
    if (!analysis) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: { columnInfo: analysis.columnInfo, rows: analysis.rows, columns: analysis.columns, qualityScore: analysis.qualityScore, missingPercent: analysis.missingPercent, duplicatesRemoved: analysis.duplicatesRemoved, dateRange: analysis.dateRange },
      });
      if (error) throw error;
      setAiSummary(data.summary);
    } catch (e) { console.error('AI summary error:', e); setAiSummary(t('ai.error')); } finally { setAiLoading(false); }
  };

  const handleReset = () => { setAnalysis(null); setFileName(''); setFile(null); setError(''); setAiSummary(''); setCatFilters({}); setNumFilter(null); };

  return (
    <PlatformLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!analysis ? (
          <>
            {/* Hero Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4 sm:py-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
                <Zap className="w-3 h-3" />
                {t('studio.badge')}
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
                {t('studio.title')} <span className="text-gradient">{t('studio.titleHighlight')}</span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
                {t('studio.subtitle')}
              </p>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Upload Area */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-8">
                <div
                  className={`relative rounded-2xl p-10 sm:p-16 text-center cursor-pointer transition-all duration-300 border-2 border-dashed ${
                    dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/60 bg-card/30 hover:bg-card/50 hover:border-primary/30'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.json,.sql" className="hidden" onChange={(e) => e.target.files?.[0] && validateFile(e.target.files[0])} />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                  <motion.div animate={dragActive ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }} className="mb-6 inline-block relative">
                    <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-lg">
                      <Upload className="w-9 h-9 text-primary-foreground" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center">
                      <BarChart3 className="w-3.5 h-3.5 text-accent-foreground" />
                    </div>
                  </motion.div>

                  <p className="text-foreground font-semibold text-lg mb-2">{t('studio.dropCleaned')}</p>
                  <p className="text-muted-foreground text-sm mb-4">{t('studio.formats')}</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {['CSV', 'XLSX', 'JSON', 'SQL'].map(fmt => (
                      <span key={fmt} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-secondary/80 text-muted-foreground border border-border/30">
                        .{fmt.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-destructive mt-4 text-sm bg-destructive/10 px-4 py-3 rounded-lg border border-destructive/20">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selected file card */}
                <AnimatePresence>
                  {file && !error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-6 glass-card p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-semibold truncate">{file.name}</p>
                          <p className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(1)} KB · {t('upload.readyToAnalyze')}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-muted-foreground h-8 w-8 p-0">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {sheets.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t('upload.sheet')}:</span>
                          <div className="relative flex-1">
                            <select value={sheetIndex} onChange={(e) => setSheetIndex(Number(e.target.value))} className="w-full bg-secondary text-secondary-foreground text-sm rounded-lg px-3 py-2 pr-8 appearance-none border border-border focus:ring-1 focus:ring-primary outline-none">
                              {sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                      )}
                      <Button onClick={processFile} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold h-12 text-base glow-primary hover:opacity-90 transition-all">
                        {isProcessing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('upload.analyzing')}</> : <><Sparkles className="w-5 h-5 mr-2" /> {t('upload.generateDashboard')}</>}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Right sidebar - features */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4 space-y-4">
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('studio.engineTitle')}</h3>
                  {[
                    { icon: Brain, labelKey: 'studio.contextDetection', descKey: 'studio.contextDetectionDesc' },
                    { icon: Target, labelKey: 'studio.smartKPIs', descKey: 'studio.smartKPIsDesc' },
                    { icon: BarChart3, labelKey: 'studio.charts', descKey: 'studio.chartsDesc' },
                    { icon: TrendingUp, labelKey: 'studio.predictiveInsights', descKey: 'studio.predictiveInsightsDesc' },
                  ].map((item, i) => (
                    <motion.div key={item.labelKey} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t(item.labelKey)}</p>
                        <p className="text-xs text-muted-foreground">{t(item.descKey)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Quick link */}
                <Button variant="outline" size="sm" className="w-full text-xs gap-2 h-10" onClick={() => navigate('/cleaning')}>
                  <ArrowLeft className="w-3 h-3" /> {t('cleaning.goToCleaning')}
                </Button>
              </motion.div>
            </div>
          </>
        ) : (
          /* ============ FULL DASHBOARD VIEW ============ */
          <div id="studio-dashboard-export">
            {/* Dashboard Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5 mb-6 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-r ${modeConfig.gradient} pointer-events-none`} />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <modeConfig.icon className={`w-6 h-6 ${modeConfig.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{fileName}</h1>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${modeConfig.color} bg-background/50 border-current/20`}>
                        {businessMode}
                      </span>
                      <DataSourceBadge fileName={fileName} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {analysis.rows.toLocaleString()} {t('common.rows')} · {analysis.columns} {t('common.columns')} · {t('common.quality')} {analysis.qualityScore}/100
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => exportDashboardAsPNG('studio-dashboard-export', fileName)} className="text-[10px] sm:text-xs h-8 px-2.5 gap-1">
                    <Image className="w-3 h-3" /> PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportDashboardAsPDF('studio-dashboard-export', fileName)} className="text-[10px] sm:text-xs h-8 px-2.5 gap-1">
                    <FileText className="w-3 h-3" /> PDF
                  </Button>
                  <div className="relative">
                    <Button variant="outline" size="sm" onClick={() => setShowExportMenu(!showExportMenu)} className="text-[10px] sm:text-xs h-8 px-2.5 gap-1">
                      <Download className="w-3 h-3" /> {t('studio.data')}
                    </Button>
                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                        <button onClick={() => { exportAsCSV(filteredData, fileName); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors">CSV</button>
                        <button onClick={() => { exportAsJSON(filteredData, fileName); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors">JSON</button>
                        <button onClick={() => { exportAsExcel(filteredData, fileName); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors">Excel</button>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={`text-[10px] sm:text-xs h-8 px-2.5 gap-1 ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}>
                    <Filter className="w-3 h-3" /> {t('common.filters')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground h-8 px-2.5">{t('header.new')}</Button>
                </div>
              </div>

              {/* Save & Share */}
              {user && (
                <div className="relative flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-border/20">
                  <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder={t('save.name')} className="h-8 text-xs w-32 sm:w-44 bg-secondary/50 border-border/30" />
                  <Button variant="ghost" size="sm" onClick={() => setIsPublic(!isPublic)} className="text-xs gap-1 h-8">
                    {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {isPublic ? t('save.public') : t('save.private')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="text-xs h-8 gap-1 gradient-primary text-primary-foreground border-0">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {t('save.dashboard')}
                  </Button>
                  {shareUrl && (
                    <Button variant="ghost" size="sm" onClick={copyLink} className="text-xs gap-1 h-8">
                      {copied ? <Check className="w-3 h-3 text-accent" /> : <Link2 className="w-3 h-3" />}
                      {copied ? t('save.copied') : t('save.copyLink')}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="glass-card p-4 mb-6 overflow-hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Filter className="w-3 h-3" /> {t('filters.activeFilters')}
                    </h3>
                    <span className="text-[10px] text-muted-foreground data-font bg-secondary px-2 py-0.5 rounded-full">
                      {filteredData.length.toLocaleString()} / {analysis.rows.toLocaleString()} {t('common.rows')}
                    </span>
                  </div>
                  {dateCol && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-20">{t('common.dateRange')}:</span>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border outline-none" />
                      <span className="text-xs text-muted-foreground">→</span>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border outline-none" />
                    </div>
                  )}
                  {numCols.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-20">{t('filters.numeric')}:</span>
                      <select value={numFilter?.col || ''} onChange={(e) => {
                        const col = numCols.find(c => c.name === e.target.value);
                        if (col?.stats) setNumFilter({ col: col.name, min: col.stats.min, max: col.stats.max });
                        else setNumFilter(null);
                      }} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border outline-none">
                        <option value="">—</option>
                        {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                      {numFilter && (
                        <>
                          <input type="number" value={numFilter.min} onChange={(e) => setNumFilter({ ...numFilter, min: Number(e.target.value) })} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border outline-none w-24 data-font" />
                          <span className="text-xs text-muted-foreground">→</span>
                          <input type="number" value={numFilter.max} onChange={(e) => setNumFilter({ ...numFilter, max: Number(e.target.value) })} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border outline-none w-24 data-font" />
                        </>
                      )}
                    </div>
                  )}
                  {catCols.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {catCols.slice(0, 5).map(col => (
                        <select key={col.name} value={catFilters[col.name] || ''} onChange={(e) => setCatFilters(prev => ({ ...prev, [col.name]: e.target.value }))} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border outline-none">
                          <option value="">{col.name} ({t('filters.all')})</option>
                          {col.topValues!.map(v => <option key={v.value} value={v.value}>{v.value} ({v.count})</option>)}
                        </select>
                      ))}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground">{t('filters.clearAll')}</Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dashboard Content */}
            <div className="space-y-4 sm:space-y-6">
              {isLoading ? <KPICardsSkeleton /> : <KPICards analysis={analysis} />}
              {!isLoading && <IntelligentKPICards analysis={analysis} />}

              {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <InsightsPanel analysis={analysis} />
                  <AnomalyDetectionPanel analysis={analysis} filteredData={filteredData} />
                  <PredictiveForecasting analysis={analysis} filteredData={filteredData} />
                </div>
              )}

              {isLoading ? <ChartSkeleton /> : <ChartViewToggle analysis={analysis} filteredData={filteredData} />}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {!isLoading && <TrendComparisonChart analysis={analysis} filteredData={filteredData} />}
                {!isLoading && numericColNames.length >= 2 && <CorrelationHeatmap data={filteredData} numericColumns={numericColNames} />}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {!isLoading && <CohortFunnelAnalysis analysis={analysis} filteredData={filteredData} />}
                {!isLoading && <ChurnRiskPanel analysis={analysis} filteredData={filteredData} />}
              </div>

              {!isLoading && <WhatIfSimulation analysis={analysis} filteredData={filteredData} />}

              {/* AI Summary */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-transparent -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('ai.strategicSummary')}</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={generateAiSummary} disabled={aiLoading} className="text-xs gap-1.5">
                    {aiLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> {t('ai.generating')}</> : <><Brain className="w-3 h-3" /> {t('common.generate')}</>}
                  </Button>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed relative">{aiSummary || t('ai.clickGenerate')}</p>
              </motion.div>

              {!isLoading && <NaturalLanguageQuery analysis={analysis} filteredData={filteredData} />}
              {!isLoading && <ExecutiveReportGenerator analysis={analysis} filteredData={filteredData} fileName={fileName} />}

              <CodeView analysis={analysis} fileName={fileName} />
              <DataTable data={filteredData} columns={analysis.columnInfo} />
            </div>

            {/* Floating panels */}
            <AiAgentChat analysis={analysis} fileName={fileName} />
            <ExecutiveSummaryPanel analysis={analysis} fileName={fileName} />
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
