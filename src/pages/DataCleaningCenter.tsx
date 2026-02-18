import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ChevronDown, Globe, Download, CheckCircle2, Trash2 } from 'lucide-react';
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
import KPICards from '@/components/dashboard/KPICards';
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

      // Save to DB
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
    // Pass analysis data via sessionStorage for studio page
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

  const downloadCleanedCSV = () => {
    if (!analysis) return;
    const csv = toCSV(analysis.cleanedData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${fileName.replace(/\.\w+$/, '')}_v1.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    const json = JSON.stringify(analysis.cleanedData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${fileName.replace(/\.\w+$/, '')}_v1.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PlatformLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Data <span className="text-gradient">Cleaning</span> Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Upload, profile, clean, and export your datasets</p>
          </div>
          {analysis && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="text-xs gap-1">
                <Trash2 className="w-3 h-3" /> Reset
              </Button>
              <Button size="sm" onClick={goToStudio} className="text-xs gap-1 gradient-primary text-primary-foreground">
                Open in Studio →
              </Button>
            </div>
          )}
        </div>

        {!analysis ? (
          /* Upload area */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full mb-4 grid grid-cols-2">
                  <TabsTrigger value="file" className="flex items-center gap-2"><Upload className="w-4 h-4" /> File Upload</TabsTrigger>
                  <TabsTrigger value="api" className="flex items-center gap-2"><Globe className="w-4 h-4" /> API Connection</TabsTrigger>
                </TabsList>

                <TabsContent value="file">
                  <div
                    className={`upload-border rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${dragActive ? 'bg-primary/5 scale-[1.02]' : 'bg-card/40 hover:bg-card/60'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                  >
                    <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.json,.sql" className="hidden" onChange={(e) => e.target.files?.[0] && validateFile(e.target.files[0])} />
                    <motion.div animate={dragActive ? { scale: 1.1 } : { scale: 1 }} className="mb-4 inline-block">
                      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
                        <Upload className="w-8 h-8 text-primary-foreground" />
                      </div>
                    </motion.div>
                    <p className="text-foreground font-medium text-lg mb-1">{t('upload.drop')}</p>
                    <p className="text-muted-foreground text-sm">CSV, Excel (.xlsx/.xls), JSON, SQL — up to 25MB</p>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-destructive mt-4 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {file && !error && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-6 glass-card p-5 space-y-4">
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
                            <span className="text-sm text-muted-foreground">{t('upload.sheet')}:</span>
                            <div className="relative flex-1">
                              <select value={sheetIndex} onChange={(e) => handleSheetChange(Number(e.target.value))} className="w-full bg-secondary text-secondary-foreground text-sm rounded-lg px-3 py-2 pr-8 appearance-none border border-border focus:ring-1 focus:ring-primary outline-none">
                                {sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                        )}
                        <Button onClick={processFile} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold h-11 text-base glow-primary hover:opacity-90 transition-opacity">
                          {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('upload.analyzing')}</> : t('upload.analyze')}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
            </div>

            {/* Sidebar: Session History */}
            <div className="space-y-4">
              <SessionHistory />
            </div>
          </div>
        ) : (
          /* Analysis Results - Two Panel Layout */
          <div className="space-y-6">
            {/* KPI Overview */}
            <KPICards analysis={analysis} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Cleaning Actions Summary */}
              <div className="space-y-4">
                <CleaningReport analysis={analysis} fileName={fileName} />
                <SchemaViewer analysis={analysis} />
              </div>

              {/* Right: Before vs After Preview */}
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Cleaned Data Preview
                    </h3>
                    <span className="text-xs text-muted-foreground data-font">
                      {analysis.rows.toLocaleString()} rows × {analysis.columns} cols
                    </span>
                  </div>
                  <div className="max-h-[400px] overflow-auto scrollbar-thin rounded-lg border border-border/30">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-secondary/90 backdrop-blur-sm">
                        <tr>
                          {analysis.columnInfo.slice(0, 8).map(col => (
                            <th key={col.name} className="px-3 py-2 text-left text-muted-foreground font-medium truncate max-w-[120px]">
                              {col.name}
                              <span className="block text-[9px] text-muted-foreground/60">{col.type}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.cleanedData.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-t border-border/20 hover:bg-secondary/30 transition-colors">
                            {analysis.columnInfo.slice(0, 8).map(col => (
                              <td key={col.name} className="px-3 py-1.5 text-foreground/80 truncate max-w-[120px] data-font">
                                {row[col.name] != null ? String(row[col.name]) : <span className="text-muted-foreground/40">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Cleaned File
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={downloadCleanedCSV}>
                    <Download className="w-3 h-3" /> cleaned_dataset_v1.csv
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={downloadCleanedExcel}>
                    <Download className="w-3 h-3" /> cleaned_dataset_v1.xlsx
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={downloadCleanedJSON}>
                    <Download className="w-3 h-3" /> cleaned_dataset_v1.json
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
