import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSheetNames, parseFile } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import LanguageToggle from './LanguageToggle';
import SessionHistory from './SessionHistory';
import DataPreview from './DataPreview';

interface FileUploadProps {
  onFileReady: (file: File, sheetIndex: number) => void;
  isProcessing: boolean;
}

const ACCEPTED = ['.csv', '.xlsx', '.xls'];
const MAX_SIZE = 25 * 1024 * 1024;

export default function FileUpload({ onFileReady, isProcessing }: FileUploadProps) {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

    // Load preview
    setLoadingPreview(true);
    try {
      const raw = await parseFile(f, 0);
      setPreviewData(raw.slice(0, 100));
    } catch { /* preview is optional */ }
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
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) validateFile(e.dataTransfer.files[0]);
  }, [validateFile]);

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground">
          <LogOut className="w-3 h-3 mr-1" /> {t('auth.logout')}
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-10">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
          <span className="text-gradient">{t('app.title.ai')}</span>{' '}
          <span className="text-foreground">{t('app.title.dashboard')}</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">{t('app.subtitle')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-2xl">
        <div
          className={`upload-border rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${dragActive ? 'bg-primary/5 scale-[1.02]' : 'bg-card/40 hover:bg-card/60'}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && validateFile(e.target.files[0])} />
          <motion.div animate={dragActive ? { scale: 1.1 } : { scale: 1 }} className="mb-4 inline-block">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
          </motion.div>
          <p className="text-foreground font-medium text-lg mb-1">{t('upload.drop')}</p>
          <p className="text-muted-foreground text-sm">{t('upload.formats')}</p>
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
              <Button onClick={() => onFileReady(file, sheetIndex)} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold h-11 text-base glow-primary hover:opacity-90 transition-opacity">
                {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('upload.analyzing')}</> : t('upload.analyze')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Preview */}
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
      </motion.div>

      <SessionHistory />
    </div>
  );
}
