import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, Loader2, ChevronDown, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlatformNavbar from '@/components/PlatformNavbar';
import Dashboard from '@/components/dashboard/Dashboard';
import TemplateGallery from '@/components/dashboard/TemplateGallery';
import TemplateDashboard from '@/components/dashboard/TemplateDashboard';
import { parseFile, analyzeDataset, getSheetNames } from '@/lib/dataProcessor';
import { useAuth } from '@/lib/authContext';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import type { TemplateId } from '@/lib/dashboardTemplates';

type StudioView = 'upload' | 'templates' | 'template-dashboard' | 'full-dashboard';

export default function DashboardStudio() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<StudioView>('upload');
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('explorer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Check for data from Data Cleaning Center
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('studio_analysis');
      if (raw) {
        sessionStorage.removeItem('studio_analysis');
        const { analysis: a, fileName: fn } = JSON.parse(raw);
        setAnalysis(a);
        setFileName(fn);
        setView('templates');
      }
    } catch {}
  }, []);

  const validateAndProcess = useCallback(async (f: File) => {
    setFile(f);
    setSheetIndex(0);
    setError('');
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      try { setSheets(await getSheetNames(f)); } catch { setSheets([]); }
    } else { setSheets([]); }
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError('');
    try {
      const rawData = await parseFile(file, sheetIndex);
      const result = analyzeDataset(rawData);
      setAnalysis(result);
      setFileName(file.name);
      setView('templates');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) validateAndProcess(e.dataTransfer.files[0]);
  }, [validateAndProcess]);

  const handleReset = useCallback(() => {
    setAnalysis(null); setFileName(''); setFile(null); setView('upload');
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

  return (
    <div className="min-h-screen bg-mesh">
      <PlatformNavbar />

      <AnimatePresence mode="wait">
        {view === 'upload' && (
          <motion.main key="upload" {...pageVariants} className="max-w-2xl mx-auto px-4 py-12">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard Studio</h1>
              <p className="text-muted-foreground text-sm">Upload a cleaned dataset or start fresh to auto-generate professional dashboards</p>
            </div>

            <div
              className={`upload-border rounded-2xl p-12 text-center cursor-pointer transition-all ${dragActive ? 'bg-primary/5 scale-[1.02]' : 'bg-card/40 hover:bg-card/60'}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.json,.sql" className="hidden" onChange={(e) => e.target.files?.[0] && validateAndProcess(e.target.files[0])} />
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary-foreground" />
              </div>
              <p className="text-foreground font-medium text-lg mb-1">Drop your dataset here</p>
              <p className="text-muted-foreground text-sm">CSV, Excel, JSON, SQL — up to 25MB</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive mt-4 text-sm">
                <span>⚠</span> {error}
              </div>
            )}

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
                    <select value={sheetIndex} onChange={(e) => setSheetIndex(Number(e.target.value))} className="bg-secondary text-secondary-foreground text-sm rounded-lg px-3 py-2 border border-border flex-1">
                      {sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
                    </select>
                  </div>
                )}
                <Button onClick={handleAnalyze} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
                  {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Dashboard...</> : 'Generate Dashboard'}
                </Button>
              </motion.div>
            )}
          </motion.main>
        )}

        {view === 'templates' && analysis && (
          <motion.div key="templates" {...pageVariants}>
            <TemplateGallery analysis={analysis} onSelect={(id) => { setSelectedTemplate(id); setView('template-dashboard'); }} />
          </motion.div>
        )}

        {view === 'template-dashboard' && analysis && (
          <motion.div key="template" {...pageVariants}>
            <TemplateDashboard
              analysis={analysis}
              templateId={selectedTemplate}
              fileName={fileName}
              onBack={handleReset}
              onSwitchTemplate={() => setView('templates')}
              onFullDashboard={() => setView('full-dashboard')}
            />
          </motion.div>
        )}

        {view === 'full-dashboard' && analysis && (
          <motion.div key="full" {...pageVariants}>
            <Dashboard analysis={analysis} fileName={fileName} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
