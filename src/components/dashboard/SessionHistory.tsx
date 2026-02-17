import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, FileSpreadsheet, Loader2, RotateCcw, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18nContext';
import { Button } from '@/components/ui/button';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface Session {
  id: string;
  file_name: string;
  row_count: number;
  quality_score: number;
  created_at: string;
  analysis_data?: unknown;
}

interface SessionHistoryProps {
  onSessionRestore?: (analysis: DatasetAnalysis, fileName: string) => void;
  onTriggerFileUpload?: () => void;
}

export default function SessionHistory({ onSessionRestore, onTriggerFileUpload }: SessionHistoryProps) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('upload_sessions')
        .select('id, file_name, row_count, quality_score, created_at, analysis_data')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        const fallback = await supabase
          .from('upload_sessions')
          .select('id, file_name, row_count, quality_score, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        if (fallback.data) setSessions(fallback.data as Session[]);
        return;
      }
      if (data) setSessions(data as Session[]);
    };
    load();
  }, []);

  const handleRestore = (session: Session) => {
    if (!onSessionRestore) return;
    setRestoreError(null);

    if (!session.analysis_data) {
      setRestoreError(t('sessions.noData') || "Bu eski sessiya — ma'lumotlar saqlanmagan. Yangi fayl yuklang, keyin sessiya qayta ishlatiladi.");
      return;
    }

    const analysis = session.analysis_data as unknown as DatasetAnalysis;
    if (analysis?.cleanedData && Array.isArray(analysis.cleanedData)) {
      setRestoringId(session.id);
      onSessionRestore(analysis, session.file_name);
      setRestoringId(null);
    } else {
      setRestoreError(t('sessions.noData') || "Sessiya ma'lumotlari topilmadi. Yangi fayl yuklang.");
    }
  };

  if (sessions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="w-full max-w-xl mt-8"
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">{t('sessions.title')}</h3>
      </div>
      <div className="space-y-2">
        {sessions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            onClick={() => handleRestore(s)}
            role={onSessionRestore ? 'button' : undefined}
            className={`glass-card px-4 py-3 flex items-center gap-3 ${onSessionRestore ? 'cursor-pointer hover:border-primary/30 transition-colors' : ''} ${restoringId && restoringId !== s.id ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{s.file_name}</span>
            <span className="text-xs text-muted-foreground data-font">{s.row_count} {t('sessions.rows')}</span>
            <span className={`text-xs data-font font-medium ${s.quality_score >= 85 ? 'text-success' : s.quality_score >= 60 ? 'text-warning' : 'text-destructive'}`}>
              {s.quality_score}/100
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(s.created_at).toLocaleDateString()}
            </span>
            {onSessionRestore && (
              <span className="shrink-0">
                {restoringId === s.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-muted-foreground" />
                )}
              </span>
            )}
          </motion.div>
        ))}
      </div>
      {onSessionRestore && (
        <p className="text-xs text-muted-foreground mt-2">
          {t('sessions.restoreHint') || 'Sessiyani qayta yuklash uchun ustiga bosing'}
        </p>
      )}
      {restoreError && (
        <div className="mt-4 p-4 rounded-xl glass-card border border-warning/30 space-y-3">
          <p className="text-warning font-medium text-sm">{restoreError}</p>
          <p className="text-muted-foreground text-xs">{t('sessions.howToFix')}</p>
          {onTriggerFileUpload && (
            <Button size="sm" onClick={onTriggerFileUpload} className="gap-1.5 h-8 text-xs gradient-primary text-primary-foreground hover:opacity-90">
              <Upload className="w-3.5 h-3.5" />
              {t('sessions.uploadFile') || "Faylni yuklash"}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
