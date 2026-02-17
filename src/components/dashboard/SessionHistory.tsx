import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18nContext';

interface Session {
  id: string;
  file_name: string;
  row_count: number;
  quality_score: number;
  created_at: string;
}

export default function SessionHistory() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    supabase
      .from('upload_sessions')
      .select('id, file_name, row_count, quality_score, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setSessions(data as Session[]);
      });
  }, []);

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
            className="glass-card px-4 py-3 flex items-center gap-3"
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
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
