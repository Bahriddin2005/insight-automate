import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import FileUpload from '@/components/dashboard/FileUpload';
import Dashboard from '@/components/dashboard/Dashboard';
import TemplateGallery from '@/components/dashboard/TemplateGallery';
import TemplateDashboard from '@/components/dashboard/TemplateDashboard';
import { parseFile, analyzeDataset } from '@/lib/dataProcessor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import type { TemplateId } from '@/lib/dashboardTemplates';
import { Loader2 } from 'lucide-react';

type View = 'upload' | 'templates' | 'template-dashboard' | 'full-dashboard';

const SESSION_KEY = 'dash_session';

interface SessionState {
  view: View;
  fileName: string;
  selectedTemplate: TemplateId;
  analysis: DatasetAnalysis | null;
}

function saveSession(state: Partial<SessionState>) {
  try {
    const existing = loadSession();
    const merged = { ...existing, ...state };
    // Only persist if there's actual analysis data
    if (merged.analysis) {
      // Limit cleanedData to 2000 rows to avoid exceeding localStorage limits
      const toStore = {
        ...merged,
        analysis: {
          ...merged.analysis,
          cleanedData: merged.analysis.cleanedData.slice(0, 2000),
        },
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(toStore));
    }
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Restore from session
  const cached = loadSession();
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(cached?.analysis ?? null);
  const [fileName, setFileName] = useState(cached?.fileName ?? '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(cached?.analysis ? (cached.view ?? 'templates') : 'upload');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(cached?.selectedTemplate ?? 'explorer');

  useEffect(() => { document.title = 'AI Smart Dashboard'; }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  // Persist session on state changes
  useEffect(() => {
    if (analysis) {
      saveSession({ view, fileName, selectedTemplate, analysis });
    }
  }, [view, fileName, selectedTemplate, analysis]);

  const handleFile = async (file: File, sheetIndex: number) => {
    setIsProcessing(true);
    setError('');
    try {
      const rawData = await parseFile(file, sheetIndex);
      const result = analyzeDataset(rawData);
      setAnalysis(result);
      setFileName(file.name);
      setView('templates');

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

  const handleSelectTemplate = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    setView('template-dashboard');
  };

  const handleReset = useCallback(() => {
    setAnalysis(null);
    setFileName('');
    setView('upload');
    clearSession();
  }, []);

  if (authLoading) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!user) return null;

  return (
    <AnimatePresence mode="wait">
      {view === 'upload' && (
        <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <FileUpload onFileReady={handleFile} isProcessing={isProcessing} />
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm">{error}</div>
          )}
        </motion.div>
      )}

      {view === 'templates' && analysis && (
        <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <TemplateGallery
            analysis={analysis}
            onSelect={handleSelectTemplate}
          />
        </motion.div>
      )}

      {view === 'template-dashboard' && analysis && (
        <motion.div key="template-dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dashboard analysis={analysis} fileName={fileName} onReset={handleReset} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
