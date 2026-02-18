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

  // Computed stats for the results view
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
                Automated Data Profiling & Cleaning
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
                Data <span className="text-gradient">Cleaning</span> Center
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
                Upload your raw dataset — we'll profile, clean, and prepare it for analysis
              </p>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Upload Area - Takes more space */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-8"
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full mb-4 grid grid-cols-2 h-11">
                    <TabsTrigger value="file" className="flex items-center gap-2 text-sm">
                      <Upload className="w-4 h-4" /> File Upload
                    </TabsTrigger>
                    <TabsTrigger value="api" className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4" /> API Connection
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

                      {/* Decorative glow */}
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
                      <p className="text-muted-foreground text-sm mb-4">CSV, Excel (.xlsx/.xls), JSON, SQL — up to 25MB</p>

                      {/* Supported format badges */}
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
                              <p className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(1)} KB · Ready to analyze</p>
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
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading preview...
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
                          <h3 className="text-foreground font-semibold">REST API Connector</h3>
                          <p className="text-muted-foreground text-xs">Connect to any REST API with authentication, pagination & scheduling</p>
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
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Auto Cleaning Pipeline</h3>
                  {[
                    { icon: Database, label: 'Data Profiling', desc: 'Type detection, missing %, outliers' },
                    { icon: Sparkles, label: 'Smart Cleaning', desc: 'Median/mode imputation, dedup' },
                    { icon: ShieldCheck, label: 'Quality Score', desc: '0-100 comprehensive rating' },
                    { icon: BarChart3, label: 'Visual Report', desc: 'Before vs After comparison' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  {fileName}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Cleaning complete · {analysis.rows.toLocaleString()} rows × {analysis.columns} columns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} className="text-xs gap-1 h-9">
                  <Trash2 className="w-3 h-3" /> Reset
                </Button>
                <Button size="sm" onClick={goToStudio} className="text-xs gap-1.5 h-9 gradient-primary text-primary-foreground glow-primary hover:opacity-90 transition-all">
                  <BarChart3 className="w-3.5 h-3.5" /> Open in Studio
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Quality Score Hero Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`glass-card p-6 relative overflow-hidden ${scoreGlow}`}
            >
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gradient-to-br from-primary/10 to-transparent -translate-y-1/2 translate-x-1/2" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 relative">
                {[
                  { label: 'Total Rows', value: analysis.rows.toLocaleString(), icon: Database, color: 'text-primary' },
                  { label: 'Columns', value: analysis.columns.toString(), icon: Columns3, color: 'text-accent' },
                  { label: 'Missing %', value: `${analysis.missingPercent}%`, icon: AlertTriangle, color: 'text-chart-3' },
                  { label: 'Duplicates Removed', value: analysis.duplicatesRemoved.toString(), icon: CopyMinus, color: 'text-chart-4' },
                  { label: 'Quality Score', value: `${analysis.qualityScore}/100`, icon: ShieldCheck, color: scoreColor },
                  ...(analysis.dateRange ? [{ label: 'Date Range', value: `${analysis.dateRange.min} → ${analysis.dateRange.max}`, icon: Calendar, color: 'text-chart-5' }] : []),
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="text-center sm:text-left"
                  >
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start mb-1">
                      <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</span>
                    </div>
                    <p className={`data-font text-xl font-bold ${stat.label === 'Quality Score' ? stat.color : 'text-foreground'}`}>
                      {stat.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Two Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Cleaning Actions Summary */}
              <div className="space-y-4">
                <CleaningReport analysis={analysis} fileName={fileName} />
                <InsightsPanel analysis={analysis} />
                <SchemaViewer analysis={analysis} />
              </div>

              {/* Right: Before vs After Preview */}
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                      Cleaned Data Preview
                    </h3>
                    <span className="text-[10px] text-muted-foreground data-font bg-secondary px-2 py-0.5 rounded-full">
                      {analysis.rows.toLocaleString()} rows × {analysis.columns} cols
                    </span>
                  </div>
                  <div className="max-h-[500px] overflow-auto scrollbar-thin rounded-lg border border-border/30">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10">
                        <tr>
                          {analysis.columnInfo.slice(0, 8).map(col => (
                            <th key={col.name} className="px-3 py-2.5 text-left text-muted-foreground font-medium truncate max-w-[140px] border-b border-border/30">
                              <span className="block truncate">{col.name}</span>
                              <span className={`text-[9px] font-normal ${
                                col.type === 'numeric' ? 'text-primary' :
                                col.type === 'categorical' ? 'text-accent' :
                                col.type === 'datetime' ? 'text-chart-3' : 'text-muted-foreground/50'
                              }`}>
                                {col.type} · {col.missingPercent.toFixed(0)}% missing
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.cleanedData.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-t border-border/10 hover:bg-primary/5 transition-colors">
                            {analysis.columnInfo.slice(0, 8).map(col => (
                              <td key={col.name} className="px-3 py-1.5 text-foreground/80 truncate max-w-[140px] data-font text-[11px]">
                                {row[col.name] != null ? String(row[col.name]) : <span className="text-muted-foreground/30 italic">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Export Section */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Download className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Download Cleaned Dataset</h3>
                    <p className="text-[10px] text-muted-foreground">Export in your preferred format</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9" onClick={downloadCleanedCSV}>
                    <Download className="w-3 h-3" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9" onClick={downloadCleanedExcel}>
                    <Download className="w-3 h-3" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9" onClick={downloadCleanedJSON}>
                    <Download className="w-3 h-3" /> JSON
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </PlatformLayout>
  );
}
