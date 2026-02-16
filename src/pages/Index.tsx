import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FileUpload from '@/components/dashboard/FileUpload';
import Dashboard from '@/components/dashboard/Dashboard';
import { parseFile, analyzeDataset } from '@/lib/dataProcessor';
import { supabase } from '@/integrations/supabase/client';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

const Index = () => {
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'AI Smart Dashboard'; }, []);

  const handleFile = async (file: File, sheetIndex: number) => {
    setIsProcessing(true);
    setError('');
    try {
      const rawData = await parseFile(file, sheetIndex);
      const result = analyzeDataset(rawData);
      setAnalysis(result);
      setFileName(file.name);

      // Save session to database
      try {
        // Keep only last 5 sessions — delete oldest if needed
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

  return (
    <AnimatePresence mode="wait">
      {analysis ? (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dashboard analysis={analysis} fileName={fileName} onReset={() => { setAnalysis(null); setFileName(''); }} />
        </motion.div>
      ) : (
        <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <FileUpload onFileReady={handleFile} isProcessing={isProcessing} />
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm">{error}</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
