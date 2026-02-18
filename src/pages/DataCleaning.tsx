import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ChevronDown, Download, Globe, CheckCircle2, AlertTriangle, Package, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSheetNames, parseFile, analyzeDataset, toCSV, toExcelBlob } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import PlatformNavbar from '@/components/PlatformNavbar';
import DataPreview from '@/components/dashboard/DataPreview';
import DataTable from '@/components/dashboard/DataTable';
import ApiConnector from '@/components/dashboard/ApiConnector';
import SavedApiConnections from '@/components/dashboard/SavedApiConnections';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

const ACCEPTED = ['.csv', '.xlsx', '.xls', '.json', '.sql'];
const MAX_SIZE = 25 * 1024 * 1024;

export default function DataCleaning() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState('file');

  const validateFile = useCallback(async (f: File) => {
    setError('');
    setPreviewData([]);
    setAnalysis(null);
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
    } catch { /* optional */ }
    setLoadingPreview(false);
  }, [t]);

  const handleAnalyze = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError('');
    try {
      const rawData = await parseFile(file, sheetIndex);
      const result = analyzeDataset(rawData);
      setAnalysis(result);
      setFileName(file.name);
      // Save session to DB
      try {
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
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApiDataReady = useCallback((apiAnalysis: DatasetAnalysis, name: string) => {
    setAnalysis(apiAnalysis);
    setFileName(name);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) validateFile(e.dataTransfer.files[0]);
  }, [validateFile]);

  const handleSheetChange = useCallback(async (idx: number) => {
    setSheetIndex(idx);
    if (file) {
      setLoadingPreview(true);
      try { const raw = await parseFile(file, idx); setPreviewData(raw.slice(0, 100)); } catch { setPreviewData([]); }
      setLoadingPreview(false);
    }
  }, [file]);

  const downloadFile = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const goToStudio = () => {
    if (analysis) {
      // Store analysis in sessionStorage so Dashboard Studio can pick it up
      sessionStorage.setItem('studio_analysis', JSON.stringify({ analysis, fileName }));
      navigate('/studio');
    }
  };

  // Cleaning report data
  const numCols = analysis?.columnInfo.filter(c => c.type === 'numeric') || [];
  const catCols = analysis?.columnInfo.filter(c => c.type === 'categorical') || [];
  const dateCols = analysis?.columnInfo.filter(c => c.type === 'datetime') || [];
  const outlierCols = numCols.filter(c => c.stats && c.stats.outliers > 0);
  const highMissing = analysis?.columnInfo.filter(c => c.missingPercent > 10) || [];

  const actions = analysis ? [
    { label: 'Whitespace Trimmed', detail: `${analysis.columns} columns`, type: 'success' as const },
    { label: 'Duplicates Removed', detail: `${analysis.duplicatesRemoved} rows`, type: analysis.duplicatesRemoved > 0 ? 'warning' as const : 'success' as const },
    { label: 'Numeric Converted', detail: `${numCols.length} columns`, type: 'success' as const },
    { label: 'Dates Parsed', detail: `${dateCols.length} columns`, type: 'success' as const },
    { label: 'Missing Values Filled', detail: `${numCols.length} median + ${catCols.length} mode`, type: highMissing.length > 0 ? 'warning' as const : 'success' as const },
    { label: 'Outliers Detected (IQR)', detail: `${outlierCols.reduce((a, c) => a + (c.stats?.outliers || 0), 0)} in ${outlierCols.length} cols`, type: outlierCols.length > 0 ? 'warning' as const : 'success' as const },
    { label: 'Names Standardized', detail: `${analysis.columns} columns`, type: 'success' as const },
  ] : [];

  return (
    <div className="min-h-screen bg-mesh">
      <PlatformNavbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Beaker className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Data Cleaning Center</h1>
              <p className="text-sm text-muted-foreground">Upload, profile, clean, and export your datasets</p>
            </div>
          </div>
        </motion.div>

        {!analysis ? (
          /* Upload area */
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4 grid grid-cols-2">
                <TabsTrigger value="file" className="gap-2"><Upload className="w-4 h-4" /> File Upload</TabsTrigger>
                <TabsTrigger value="api" className="gap-2"><Globe className="w-4 h-4" /> API Connection</TabsTrigger>
              </TabsList>

              <TabsContent value="file">
                <div
                  className={`upload-border rounded-2xl p-12 text-center cursor-pointer transition-all ${dragActive ? 'bg-primary/5 scale-[1.02]' : 'bg-card/40 hover:bg-card/60'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.json,.sql" className="hidden" onChange={(e) => e.target.files?.[0] && validateFile(e.target.files[0])} />
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <p className="text-foreground font-medium text-lg mb-1">Drop your file here or click to browse</p>
                  <p className="text-muted-foreground text-sm">CSV, Excel, JSON, SQL — up to 25MB</p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-destructive mt-4 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {file && !error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 glass-card p-5 space-y-4">
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
                        <div className="relative flex-1">
                          <select value={sheetIndex} onChange={(e) => handleSheetChange(Number(e.target.value))} className="w-full bg-secondary text-secondary-foreground text-sm rounded-lg px-3 py-2 pr-8 appearance-none border border-border">
                            {sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    )}
                    <Button onClick={handleAnalyze} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
                      {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Analyze & Clean'}
                    </Button>
                  </motion.div>
                )}

                {previewData.length > 0 && !loadingPreview && <DataPreview data={previewData} />}
                {loadingPreview && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading preview...
                  </div>
                )}
              </TabsContent>

              <TabsContent value="api">
                <div className="glass-card p-6 rounded-2xl">
                  <ApiConnector onDataReady={handleApiDataReady} />
                </div>
                <div className="mt-4">
                  <SavedApiConnections onDataReady={handleApiDataReady} />
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          /* Cleaning Results - Two panel layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Cleaning Report */}
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 space-y-4">
              {/* Quality Score Card */}
              <div className="glass-card p-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Data Quality Score</p>
                <div className={`text-5xl font-bold ${analysis.qualityScore >= 80 ? 'text-primary' : analysis.qualityScore >= 50 ? 'text-warning' : 'text-destructive'}`}>
                  {analysis.qualityScore}
                </div>
                <p className="text-xs text-muted-foreground mt-1">/ 100</p>
              </div>

              {/* Stats */}
              <div className="glass-card p-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Original Rows', value: analysis.rawRowCount.toLocaleString() },
                  { label: 'Cleaned Rows', value: analysis.rows.toLocaleString() },
                  { label: 'Columns', value: String(analysis.columns) },
                  { label: 'Missing %', value: `${analysis.missingPercent}%` },
                ].map((s, i) => (
                  <div key={i} className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                    <p className="text-lg font-bold text-foreground data-font">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Actions taken */}
              <div className="glass-card p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Cleaning Actions</h3>
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {a.type === 'success'
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />}
                      <span className="text-foreground/80">{a.label}</span>
                      <span className="text-muted-foreground ml-auto data-font">{a.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export buttons */}
              <div className="glass-card p-4 space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Export Cleaned Data</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(toCSV(analysis.cleanedData), `cleaned_${fileName.replace(/\.\w+$/, '')}_v1.csv`, 'text/csv')}>
                    <Download className="w-3 h-3" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
                    const blob = toExcelBlob(analysis.cleanedData);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `cleaned_${fileName.replace(/\.\w+$/, '')}_v1.xlsx`; a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download className="w-3 h-3" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(JSON.stringify(analysis.cleanedData, null, 2), `cleaned_${fileName.replace(/\.\w+$/, '')}_v1.json`, 'application/json')}>
                    <Download className="w-3 h-3" /> JSON
                  </Button>
                </div>
              </div>

              {/* Send to Studio button */}
              <Button onClick={goToStudio} className="w-full gradient-primary text-primary-foreground font-semibold h-11 gap-2">
                Open in Dashboard Studio →
              </Button>
            </motion.div>

            {/* Right Panel: Before vs After Preview */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-4">
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Cleaned Dataset Preview
                  </h3>
                  <span className="text-xs text-muted-foreground data-font">
                    {analysis.rows.toLocaleString()} rows × {analysis.columns} columns
                  </span>
                </div>
                <DataTable data={analysis.cleanedData} columns={analysis.columnInfo} />
              </div>

              {/* Column profiling */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Column Profiling</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-2 text-muted-foreground">Column</th>
                        <th className="text-left p-2 text-muted-foreground">Type</th>
                        <th className="text-right p-2 text-muted-foreground">Missing %</th>
                        <th className="text-right p-2 text-muted-foreground">Unique</th>
                        <th className="text-right p-2 text-muted-foreground">Outliers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.columnInfo.map((col, i) => (
                        <tr key={i} className="border-b border-border/20 hover:bg-secondary/30">
                          <td className="p-2 text-foreground font-medium">{col.name}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              col.type === 'numeric' ? 'bg-primary/10 text-primary' :
                              col.type === 'categorical' ? 'bg-accent/10 text-accent' :
                              col.type === 'datetime' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-muted-foreground'
                            }`}>{col.type}</span>
                          </td>
                          <td className={`p-2 text-right data-font ${col.missingPercent > 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {col.missingPercent.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right data-font text-muted-foreground">{col.uniqueCount}</td>
                          <td className="p-2 text-right data-font text-muted-foreground">{col.stats?.outliers || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
