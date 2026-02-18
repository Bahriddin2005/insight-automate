import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ChevronDown, Filter, Image, FileText, Download, Save, Link2, Check, Globe, Lock, Sparkles } from 'lucide-react';
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

  // Check for data passed from Cleaning Center
  const studioData = (() => {
    try {
      const raw = sessionStorage.getItem('studio_analysis');
      if (raw) {
        sessionStorage.removeItem('studio_analysis');
        return JSON.parse(raw);
      }
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

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [catFilters, setCatFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [numFilter, setNumFilter] = useState<{ col: string; min: number; max: number } | null>(null);

  // Save
  const [saveName, setSaveName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // AI
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    if (analysis) {
      setDateFrom(analysis.dateRange?.min || '');
      setDateTo(analysis.dateRange?.max || '');
      setSaveName(fileName);
    }
  }, [analysis, fileName]);

  const businessMode = analysis ? detectBusinessMode(analysis) : '';

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
    setFile(f);
    setSheetIndex(0);
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
    setIsProcessing(true);
    setError('');
    try {
      const rawData = await parseFile(file, sheetIndex);
      const result = analyzeDataset(rawData);
      setAnalysis(result);
      setFileName(file.name);
      setIsLoading(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAllFilters = () => {
    setCatFilters({});
    setDateFrom(analysis?.dateRange?.min || '');
    setDateTo(analysis?.dateRange?.max || '');
    setNumFilter(null);
  };

  const handleSave = async () => {
    if (!user || !analysis) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('dashboard_configs').insert([{
        user_id: user.id,
        name: saveName || fileName,
        is_public: isPublic,
        config: JSON.parse(JSON.stringify({ catFilters })),
        file_name: fileName,
        analysis_data: JSON.parse(JSON.stringify(analysis)),
      }]).select('share_token').single();
      if (error) throw error;
      setShareUrl(`${window.location.origin}/shared/${data.share_token}`);
    } catch (e) { console.error('Save error:', e); } finally { setSaving(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateAiSummary = async () => {
    if (!analysis) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: {
          columnInfo: analysis.columnInfo,
          rows: analysis.rows,
          columns: analysis.columns,
          qualityScore: analysis.qualityScore,
          missingPercent: analysis.missingPercent,
          duplicatesRemoved: analysis.duplicatesRemoved,
          dateRange: analysis.dateRange,
        },
      });
      if (error) throw error;
      setAiSummary(data.summary);
    } catch (e) {
      console.error('AI summary error:', e);
      setAiSummary('Failed to generate summary.');
    } finally { setAiLoading(false); }
  };

  const handleReset = () => {
    setAnalysis(null);
    setFileName('');
    setFile(null);
    setError('');
    setAiSummary('');
    setCatFilters({});
    setNumFilter(null);
  };

  return (
    <PlatformLayout>
      {!analysis ? (
        /* Upload area for Dashboard Studio */
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Dashboard <span className="text-gradient">Studio</span>
            </h1>
            <p className="text-muted-foreground mt-2">Upload a cleaned dataset or use one from Cleaning Center</p>
          </div>

          <div
            className={`upload-border rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${dragActive ? 'bg-primary/5 scale-[1.02]' : 'bg-card/40 hover:bg-card/60'}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.json,.sql" className="hidden" onChange={(e) => e.target.files?.[0] && validateFile(e.target.files[0])} />
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-foreground font-medium text-lg mb-1">Drop your cleaned dataset here</p>
            <p className="text-muted-foreground text-sm">CSV, Excel, JSON, SQL — up to 25MB</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {file && !error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate">{file.name}</p>
                  <p className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              {sheets.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sheet:</span>
                  <select value={sheetIndex} onChange={(e) => setSheetIndex(Number(e.target.value))} className="bg-secondary text-secondary-foreground text-sm rounded-lg px-3 py-2 border border-border outline-none">
                    {sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
                  </select>
                </div>
              )}
              <Button onClick={processFile} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold h-11 glow-primary">
                {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Generate Dashboard'}
              </Button>
            </motion.div>
          )}

          {/* Quick action: go to cleaning center */}
          <div className="text-center">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate('/cleaning')}>
              ← Go to Data Cleaning Center first
            </Button>
          </div>
        </div>
      ) : (
        /* Full Dashboard View */
        <div id="studio-dashboard-export">
          {/* Dashboard Header */}
          <div className="sticky top-14 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">{fileName}</h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">{businessMode}</span>
                  <DataSourceBadge fileName={fileName} />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {analysis.rows.toLocaleString()} rows · {analysis.columns} cols · Quality: {analysis.qualityScore}/100
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="outline" size="sm" onClick={() => exportDashboardAsPNG('studio-dashboard-export', fileName)} className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                  <Image className="w-3 h-3" /> <span className="hidden sm:inline ml-1">PNG</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportDashboardAsPDF('studio-dashboard-export', fileName)} className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                  <FileText className="w-3 h-3" /> <span className="hidden sm:inline ml-1">PDF</span>
                </Button>
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowExportMenu(!showExportMenu)} className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                    <Download className="w-3 h-3" /> <span className="hidden sm:inline ml-1">Data</span>
                  </Button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                      <button onClick={() => { exportAsCSV(filteredData, fileName); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors">CSV</button>
                      <button onClick={() => { exportAsJSON(filteredData, fileName); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors">JSON</button>
                      <button onClick={() => { exportAsExcel(filteredData, fileName); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors">Excel</button>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                  <Filter className="w-3 h-3 mr-1" /> <span className="hidden sm:inline">Filters</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground h-7 sm:h-8 px-2">New</Button>
              </div>
            </div>

            {/* Save & Share */}
            {user && (
              <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Dashboard name" className="h-7 text-xs w-28 sm:w-40 bg-secondary border-border" />
                <Button variant="ghost" size="sm" onClick={() => setIsPublic(!isPublic)} className="text-xs gap-1 h-7">
                  {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {isPublic ? 'Public' : 'Private'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="text-xs h-7">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                  Save
                </Button>
                {shareUrl && (
                  <Button variant="ghost" size="sm" onClick={copyLink} className="text-xs gap-1 h-7">
                    {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>
                )}
              </div>
            )}

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
                    {dateCol && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium w-20">Date Range:</span>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border outline-none" />
                        <span className="text-xs text-muted-foreground">→</span>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border outline-none" />
                      </div>
                    )}
                    {numCols.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium w-20">Numeric:</span>
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
                            <option value="">{col.name} (All)</option>
                            {col.topValues!.map(v => <option key={v.value} value={v.value}>{v.value} ({v.count})</option>)}
                          </select>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground">Clear</Button>
                      <span className="text-xs text-muted-foreground data-font">{filteredData.length.toLocaleString()} / {analysis.rows.toLocaleString()} rows</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dashboard Content */}
          <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {/* KPI Cards */}
            {isLoading ? <KPICardsSkeleton /> : <KPICards analysis={analysis} />}
            {!isLoading && <IntelligentKPICards analysis={analysis} />}

            {/* Charts - 2D/3D/4D toggle */}
            {isLoading ? <ChartSkeleton /> : <ChartViewToggle analysis={analysis} filteredData={filteredData} />}

            {/* Trend + Forecasting */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {!isLoading && <TrendComparisonChart analysis={analysis} filteredData={filteredData} />}
              {!isLoading && <PredictiveForecasting analysis={analysis} filteredData={filteredData} />}
            </div>

            {/* Anomaly + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {!isLoading && <AnomalyDetectionPanel analysis={analysis} filteredData={filteredData} />}
              <InsightsPanel analysis={analysis} />
            </div>

            {/* Correlation + Cohort */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {!isLoading && numericColNames.length >= 2 && <CorrelationHeatmap data={filteredData} numericColumns={numericColNames} />}
              {!isLoading && <CohortFunnelAnalysis analysis={analysis} filteredData={filteredData} />}
            </div>

            {/* Risk + What-If */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {!isLoading && <ChurnRiskPanel analysis={analysis} filteredData={filteredData} />}
              {!isLoading && <WhatIfSimulation analysis={analysis} filteredData={filteredData} />}
            </div>

            {/* AI Summary */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-warm flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-foreground" />
                  </div>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">AI Summary</h2>
                </div>
                <Button variant="outline" size="sm" onClick={generateAiSummary} disabled={aiLoading} className="text-xs">
                  {aiLoading ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Generating...</> : 'Generate'}
                </Button>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{aiSummary || 'Click Generate to get AI-powered insights about your data.'}</p>
            </motion.div>

            {/* NL Query + Report */}
            {!isLoading && <NaturalLanguageQuery analysis={analysis} filteredData={filteredData} />}
            {!isLoading && <ExecutiveReportGenerator analysis={analysis} filteredData={filteredData} fileName={fileName} />}

            {/* Code View + Data Table */}
            <CodeView analysis={analysis} fileName={fileName} />
            <DataTable data={filteredData} columns={analysis.columnInfo} />
          </main>

          {/* Floating panels */}
          <AiAgentChat analysis={analysis} fileName={fileName} />
          <ExecutiveSummaryPanel analysis={analysis} fileName={fileName} />
        </div>
      )}
    </PlatformLayout>
  );
}
