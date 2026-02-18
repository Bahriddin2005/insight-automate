import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, AlertCircle, Loader2, ChevronDown, Globe,
  Download, CheckCircle2, Trash2, ArrowRight, Database, Columns3,
  AlertTriangle, CopyMinus, ShieldCheck, Calendar, Sparkles, Zap, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSheetNames, parseFile, analyzeDataset, toCSV, toExcelBlob } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import PlatformLayout from '@/components/layout/PlatformLayout';
import DataPreview from '@/components/dashboard/DataPreview';
import ApiConnector from '@/components/dashboard/ApiConnector';
import SavedApiConnections from '@/components/dashboard/SavedApiConnections';
import ApiHealthMonitor from '@/components/dashboard/ApiHealthMonitor';
import CleaningReport from '@/components/dashboard/CleaningReport';
import SchemaViewer from '@/components/dashboard/SchemaViewer';
import InsightsPanel from '@/components/dashboard/InsightsPanel';
import SessionHistory from '@/components/dashboard/SessionHistory';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

const ACCEPTED = ['.csv', '.xlsx', '.xls', '.json', '.sql'];
const MAX_SIZE = 25 * 1024 * 1024;
const SESSION_KEY = 'cleaning_session';

function saveCleaningSession(analysis: DatasetAnalysis, fileName: string) {
  try {
    const toStore = {
      analysis: { ...analysis, cleanedData: analysis.cleanedData.slice(0, 2000) },
      fileName,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(toStore));
  } catch { /* ignore */ }
}

function loadCleaningSession(): { analysis: DatasetAnalysis; fileName: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function DataCleaningCenter() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const cached = loadCleaningSession();
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(cached?.analysis ?? null);
  const [fileName, setFileName] = useState(cached?.fileName ?? '');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('file');

  const validateFile = useCallback(async (f: File) => {
    setError('');
    setPreviewData([]);
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) { setError(t('upload.error.type')); return; }
    if (f.size > MAX_SIZE) { setError(t('upload.error.size')); return; }
    setFile(f);
    setSheetIndex(0);

    if (ext === '.xlsx' || ext === '.xls') {
      try { const names = await getSheetNames(f); setSheets(names); } catch { setSheets([]); }
    } else { setSheets([]); }

    setLoadingPreview(true);
    try {
      const raw = await parseFile(f, 0);
      setPreviewData(raw.slice(0, 100));
    } catch { /* preview optional */ }
    setLoadingPreview(false);
  }, [t]);

  const handleSheetChange = useCallback(async (idx: number) => {
    setSheetIndex(idx);
    if (file) {
      setLoadingPreview(true);
      try {
        const raw = await parseFile(file, idx);
        setPreviewData(raw.slice(0, 100));
      } catch { setPreviewData([]); }
      setLoadingPreview(false);
    }
  }, [file]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
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
      saveCleaningSession(result, file.name);

      try {
        const { data: existing } = await supabase
          .from('upload_sessions')
          .select('id')
          .order('created_at', { ascending: false });
        if (existing && existing.length >= 5) {
          const toDelete = existing.slice(4).map(s => s.id);
          await supabase.from('upload_sessions').delete().in('id', toDelete);
        }
        await supabase.from('upload_sessions').insert([{
          file_name: file.name,
          row_count: result.rows,
          column_count: result.columns,
          quality_score: result.qualityScore,
          missing_percent: result.missingPercent,
          duplicates_removed: result.duplicatesRemoved,
          column_info: JSON.parse(JSON.stringify(result.columnInfo)),
          user_id: user?.id,
        }]);
      } catch (dbErr) {
        console.error('Failed to save session:', dbErr);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApiDataReady = useCallback((apiAnalysis: DatasetAnalysis, name: string) => {
    setAnalysis(apiAnalysis);
    setFileName(name);
    saveCleaningSession(apiAnalysis, name);
  }, []);

  const handleReset = () => {
    setAnalysis(null);
    setFileName('');
    setFile(null);
    setPreviewData([]);
    localStorage.removeItem(SESSION_KEY);
  };

  const goToStudio = () => {
    if (analysis) {
      try {
        sessionStorage.setItem('studio_analysis', JSON.stringify({
          analysis: { ...analysis, cleanedData: analysis.cleanedData.slice(0, 2000) },
          fileName,
        }));
      } catch { /* ignore */ }
      navigate('/studio');
    }
  };

  const downloadFile = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCleanedCSV = () => {
    if (!analysis) return;
    downloadFile(toCSV(analysis.cleanedData), `cleaned_${fileName.replace(/\.\w+$/, '')}_v1.csv`, 'text/csv');
  };

  const downloadCleanedExcel = () => {
    if (!analysis) return;
    const blob = toExcelBlob(analysis.cleanedData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${fileName.replace(/\.\w+$/, '')}_v1.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCleanedJSON = () => {
    if (!analysis) return;
    downloadFile(JSON.stringify(analysis.cleanedData, null, 2), `cleaned_${fileName.replace(/\.\w+$/, '')}_v1.json`, 'application/json');
  };

  const scoreColor = analysis
    ? analysis.qualityScore >= 85 ? 'text-accent' : analysis.qualityScore >= 60 ? 'text-warning' : 'text-destructive'
    : '';

  const scoreGlow = analysis
    ? analysis.qualityScore >= 85 ? 'glow-success' : analysis.qualityScore >= 60 ? 'glow-warning' : 'glow-destructive'
    : '';

  return (
    <PlatformLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!analysis ? (
          <>
            {/* Hero Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-4 sm:py-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
                <Zap className="w-3 h-3" />
                {t('cleaning.badge')}
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
                {t('cleaning.title1')} <span className="text-gradient">{t('cleaning.title2')}</span> {t('cleaning.title3')}
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
                {t('cleaning.subtitle')}
              </p>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
              {/* Upload Area */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-8"
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full mb-4 grid grid-cols-2 h-11">
                    <TabsTrigger value="file" className="flex items-center gap-2 text-sm">
                      <Upload className="w-4 h-4" /> {t('cleaning.fileUpload')}
                    </TabsTrigger>
                    <TabsTrigger value="api" className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4" /> {t('cleaning.apiConnection')}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="file">
                    {/* Drop zone */}
                    <div
                      className={`relative rounded-2xl p-10 sm:p-16 text-center cursor-pointer transition-all duration-300 border-2 border-dashed ${
                        dragActive
                          ? 'border-primary bg-primary/5 scale-[1.01]'
                          : 'border-border/60 bg-card/30 hover:bg-card/50 hover:border-primary/30'
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
                          <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
                        </div>
                      </motion.div>

                      <p className="text-foreground font-semibold text-lg mb-2">{t('upload.drop')}</p>
                      <p className="text-muted-foreground text-sm mb-4">{t('upload.formatsLong')}</p>

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
                            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPreviewData([]); }} className="text-muted-foreground h-8 w-8 p-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {sheets.length > 1 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{t('upload.sheet')}:</span>
                              <div className="relative flex-1">
                                <select value={sheetIndex} onChange={(e) => handleSheetChange(Number(e.target.value))} className="w-full bg-secondary text-secondary-foreground text-sm rounded-lg px-3 py-2 pr-8 appearance-none border border-border focus:ring-1 focus:ring-primary outline-none">
                                  {sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                              </div>
                            </div>
                          )}
                          <Button onClick={processFile} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold h-12 text-base glow-primary hover:opacity-90 transition-all">
                            {isProcessing ? (
                              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('upload.analyzing')}</>
                            ) : (
                              <><Sparkles className="w-5 h-5 mr-2" /> {t('upload.analyze')}</>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Data preview */}
                    <AnimatePresence>
                      {previewData.length > 0 && !loadingPreview && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <DataPreview data={previewData} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {loadingPreview && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t('upload.loadingPreview')}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="api">
                    <div className="glass-card p-6 rounded-2xl">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                          <Globe className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-foreground font-semibold">{t('cleaning.apiConnectorTitle')}</h3>
                          <p className="text-muted-foreground text-xs">{t('cleaning.apiConnectorDesc')}</p>
                        </div>
                      </div>
                      <ApiConnector onDataReady={handleApiDataReady} />
                    </div>
                    <div className="mt-4 space-y-4">
                      <SavedApiConnections onDataReady={handleApiDataReady} />
                      <ApiHealthMonitor />
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>

              {/* Right sidebar */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-4 space-y-4"
              >
                {/* Feature highlights */}
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('cleaning.pipelineTitle')}</h3>
                  {[
                    { icon: Database, labelKey: 'cleaning.dataProfiling', descKey: 'cleaning.dataProfilingDesc' },
                    { icon: Sparkles, labelKey: 'cleaning.smartCleaning', descKey: 'cleaning.smartCleaningDesc' },
                    { icon: ShieldCheck, labelKey: 'cleaning.qualityScore', descKey: 'cleaning.qualityScoreDesc' },
                    { icon: BarChart3, labelKey: 'cleaning.visualReport', descKey: 'cleaning.visualReportDesc' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.labelKey}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="flex items-start gap-3"
                    >
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

                {/* Session history */}
                <SessionHistory />
              </motion.div>
            </div>
          </>
        ) : (
          /* ============ ANALYSIS RESULTS VIEW ============ */
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  {fileName}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('cleaning.complete')} · {analysis.rows.toLocaleString()} {t('common.rows')} × {analysis.columns} {t('common.columns')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} className="text-xs gap-1 h-9">
                  <Trash2 className="w-3 h-3" /> {t('cleaning.reset')}
                </Button>
                <Button size="sm" onClick={goToStudio} className="text-xs gap-1.5 h-9 gradient-primary text-primary-foreground glow-primary hover:opacity-90 transition-all">
                  <BarChart3 className="w-3.5 h-3.5" /> {t('cleaning.openInStudio')} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* === 3-Column Top Panel === */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* File Upload Info */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <h3 className="text-sm font-semibold text-foreground mb-4 relative">{t('cleaning.fileUploadInfo')}</h3>
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 truncate max-w-full">{fileName}</p>
                  <div className="grid grid-cols-2 gap-3 w-full text-left">
                    {[
                      { label: t('cleaning.rows'), val: analysis.rows.toLocaleString() },
                      { label: t('cleaning.columns'), val: analysis.columns },
                      { label: t('cleaning.duplicates'), val: analysis.duplicatesRemoved },
                      { label: t('cleaning.missingLabel'), val: `${analysis.missingPercent}%` },
                    ].map(s => (
                      <div key={s.label} className="bg-secondary/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                        <p className="text-sm font-bold text-foreground data-font">{s.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Data Quality Score */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={`glass-card p-6 flex flex-col items-center justify-center ${scoreGlow}`}>
                <h3 className="text-sm font-semibold text-foreground mb-4">{t('cleaning.qualityScoreCard')}</h3>
                <div className="relative w-36 h-36 mb-4">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="8" opacity="0.2" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={analysis.qualityScore >= 85 ? 'hsl(var(--accent))' : analysis.qualityScore >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
                      strokeWidth="8" strokeLinecap="round" strokeDasharray={`${analysis.qualityScore * 3.14} 314`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold data-font ${scoreColor}`}>{analysis.qualityScore}%</span>
                    <span className="text-[10px] text-muted-foreground">{t('cleaning.quality')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-center">
                  <div><p className="text-lg font-bold text-foreground data-font">{analysis.columns}</p><p className="text-[10px] text-muted-foreground">{t('cleaning.columns')}</p></div>
                  <div><p className="text-lg font-bold text-foreground data-font">{analysis.duplicatesRemoved}</p><p className="text-[10px] text-muted-foreground">{t('cleaning.duplicates')}</p></div>
                </div>
              </motion.div>

              {/* Column Profiling */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">{t('cleaning.columnProfiling')}</h3>
                <div className="space-y-2.5 max-h-[300px] overflow-auto scrollbar-thin">
                  {analysis.columnInfo.map(col => (
                    <div key={col.name} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{col.name}</p>
                        <p className={`text-[10px] ${col.type === 'numeric' ? 'text-primary' : col.type === 'categorical' ? 'text-accent' : col.type === 'datetime' ? 'text-chart-3' : 'text-muted-foreground/50'}`}>{col.type}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-bold text-foreground data-font">{col.stats ? col.stats.mean?.toFixed(1) ?? col.uniqueCount : col.uniqueCount}</p>
                        <p className="text-[10px] text-muted-foreground">{col.missingPercent.toFixed(0)}% {t('cleaning.missing')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* === Before / After Tables === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
                <h3 className="text-lg font-bold text-foreground mb-3">{t('cleaning.before')}</h3>
                <div className="max-h-[350px] overflow-auto scrollbar-thin rounded-lg border border-border/30">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10">
                      <tr>{analysis.columnInfo.slice(0, 6).map(col => (
                        <th key={col.name} className="px-2.5 py-2 text-left text-muted-foreground font-medium truncate max-w-[100px] border-b border-border/30 text-[10px]">{col.name}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {analysis.cleanedData.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t border-border/10">
                          {analysis.columnInfo.slice(0, 6).map(col => (
                            <td key={col.name} className="px-2.5 py-1.5 text-foreground/60 truncate max-w-[100px] data-font text-[11px]">
                              {row[col.name] != null ? String(row[col.name]) : <span className="text-muted-foreground/30 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
                <h3 className="text-lg font-bold text-foreground mb-3">{t('cleaning.after')}</h3>
                <div className="max-h-[350px] overflow-auto scrollbar-thin rounded-lg border border-border/30">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10">
                      <tr>{analysis.columnInfo.slice(0, 6).map(col => (
                        <th key={col.name} className="px-2.5 py-2 text-left text-muted-foreground font-medium truncate max-w-[100px] border-b border-border/30 text-[10px]">{col.name}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {analysis.cleanedData.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t border-border/10">
                          {analysis.columnInfo.slice(0, 6).map(col => (
                            <td key={col.name} className={`px-2.5 py-1.5 truncate max-w-[100px] data-font text-[11px] ${row[col.name] != null ? 'text-primary bg-primary/5 rounded' : 'text-muted-foreground/30 italic'}`}>
                              {row[col.name] != null ? String(row[col.name]) : 'null'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>

            {/* Cleaning Report & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CleaningReport analysis={analysis} fileName={fileName} />
              <InsightsPanel analysis={analysis} />
            </div>
            <SchemaViewer analysis={analysis} />

            {/* Export */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Download className="w-4 h-4 text-accent" /></div>
                  <div><h3 className="text-sm font-medium text-foreground">{t('cleaning.downloadCleaned')}</h3><p className="text-[10px] text-muted-foreground">{t('cleaning.downloadCleanedDesc')}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9" onClick={downloadCleanedCSV}><Download className="w-3 h-3" /> CSV</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9" onClick={downloadCleanedExcel}><Download className="w-3 h-3" /> Excel</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9" onClick={downloadCleanedJSON}><Download className="w-3 h-3" /> JSON</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </PlatformLayout>
  );
}
