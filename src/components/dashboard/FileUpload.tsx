import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSheetNames } from '@/lib/dataProcessor';

interface FileUploadProps {
  onFileReady: (file: File, sheetIndex: number) => void;
  isProcessing: boolean;
}

const ACCEPTED = ['.csv', '.xlsx', '.xls'];
const MAX_SIZE = 25 * 1024 * 1024;

export default function FileUpload({ onFileReady, isProcessing }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(async (f: File) => {
    setError('');
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) { setError('Please upload a CSV, XLSX, or XLS file.'); return; }
    if (f.size > MAX_SIZE) { setError('File exceeds 25MB limit.'); return; }

    setFile(f);
    setSheetIndex(0);

    if (ext === '.xlsx' || ext === '.xls') {
      try {
        const names = await getSheetNames(f);
        setSheets(names);
      } catch { setSheets([]); }
    } else {
      setSheets([]);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) validateFile(e.dataTransfer.files[0]);
  }, [validateFile]);

  const handleAnalyze = () => {
    if (file) onFileReady(file, sheetIndex);
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-10"
      >
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
          <span className="text-gradient">AI Smart</span>{' '}
          <span className="text-foreground">Dashboard</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          Transform your spreadsheets into intelligent, interactive analytics dashboards — instantly.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-xl"
      >
        <div
          className={`upload-border rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            dragActive ? 'bg-primary/5 scale-[1.02]' : 'bg-card/40 hover:bg-card/60'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && validateFile(e.target.files[0])}
          />

          <motion.div animate={dragActive ? { scale: 1.1 } : { scale: 1 }} className="mb-4 inline-block">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
          </motion.div>

          <p className="text-foreground font-medium text-lg mb-1">
            Drop your file here or click to browse
          </p>
          <p className="text-muted-foreground text-sm">
            CSV, XLSX, XLS — up to 25MB
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-destructive mt-4 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {file && !error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 glass-card p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate">{file.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              {sheets.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sheet:</span>
                  <div className="relative flex-1">
                    <select
                      value={sheetIndex}
                      onChange={(e) => setSheetIndex(Number(e.target.value))}
                      className="w-full bg-secondary text-secondary-foreground text-sm rounded-lg px-3 py-2 pr-8 appearance-none border border-border focus:ring-1 focus:ring-primary outline-none"
                    >
                      {sheets.map((s, i) => (
                        <option key={i} value={i}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={isProcessing}
                className="w-full gradient-primary text-primary-foreground font-semibold h-11 text-base glow-primary hover:opacity-90 transition-opacity"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  'Analyze Dataset'
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
