import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, ExternalLink, Loader2, LayoutDashboard, Globe, Lock, FileSpreadsheet, Rows3, Columns3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import PlatformLayout from '@/components/layout/PlatformLayout';
import { TEMPLATES } from '@/lib/dashboardTemplates';
import type { Json } from '@/integrations/supabase/types';

interface DashConfig {
  id: string;
  name: string;
  file_name: string | null;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
  template_id: string | null;
  analysis_data: Json | null;
}

function QualityBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-accent bg-accent/15' : score >= 50 ? 'text-warning bg-warning/15' : 'text-destructive bg-destructive/15';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full data-font ${color}`}>
      {score}/100
    </span>
  );
}

function MiniBarPreview({ columnInfo }: { columnInfo: Array<{ type: string; missingPercent: number }> }) {
  const cols = columnInfo.slice(0, 12);
  const typeColors: Record<string, string> = {
    numeric: 'hsl(var(--primary))',
    categorical: 'hsl(var(--accent))',
    datetime: 'hsl(var(--chart-3))',
    text: 'hsl(var(--muted-foreground))',
    id: 'hsl(var(--destructive))',
  };
  return (
    <div className="flex items-end gap-px h-6">
      {cols.map((c, i) => (
        <div
          key={i}
          className="rounded-t-sm min-w-[4px] flex-1"
          style={{
            height: `${Math.max(20, 100 - c.missingPercent)}%`,
            backgroundColor: typeColors[c.type] || 'hsl(var(--muted))',
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

export default function MyDashboards() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<DashConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('dashboard_configs')
      .select('id, name, file_name, is_public, share_token, created_at, template_id, analysis_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setDashboards(data as DashConfig[]);
        setLoading(false);
      });
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('dashboards.confirmDelete'))) return;
    setDeleting(id);
    await supabase.from('dashboard_configs').delete().eq('id', id);
    setDashboards(prev => prev.filter(d => d.id !== id));
    setDeleting(null);
  };

  return (
    <PlatformLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t('dashboards.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{dashboards.length} {t('dashboards.count')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : dashboards.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <LayoutDashboard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('dashboards.empty')}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/studio')}>
              {t('dashboards.createFirst')}
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((d, i) => {
              const tmpl = d.template_id ? TEMPLATES.find(t => t.id === d.template_id) : null;
              const analysisData = d.analysis_data as Record<string, unknown> | null;
              const rows = analysisData?.rows as number | undefined;
              const columns = analysisData?.columns as number | undefined;
              const qualityScore = analysisData?.qualityScore as number | undefined;
              const columnInfo = analysisData?.columnInfo as Array<{ type: string; missingPercent: number }> | undefined;

              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card overflow-hidden group hover:border-primary/40 transition-all duration-300"
                >
                  <div className={`h-1.5 w-full ${tmpl ? `bg-gradient-to-r ${tmpl.color}` : 'gradient-primary'}`} />
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-xl">
                        {tmpl ? tmpl.icon : '📊'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{d.name}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{tmpl ? tmpl.name : t('dashboards.fullDashboard')}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {d.is_public ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                        {d.is_public ? t('save.public') : t('save.private')}
                      </span>
                    </div>
                    {columnInfo && columnInfo.length > 0 && <MiniBarPreview columnInfo={columnInfo} />}
                    <div className="flex items-center gap-3 flex-wrap">
                      {d.file_name && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <FileSpreadsheet className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{d.file_name}</span>
                        </span>
                      )}
                      {rows != null && <span className="flex items-center gap-1 text-[10px] text-muted-foreground data-font"><Rows3 className="w-3 h-3" /> {rows.toLocaleString()}</span>}
                      {columns != null && <span className="flex items-center gap-1 text-[10px] text-muted-foreground data-font"><Columns3 className="w-3 h-3" /> {columns}</span>}
                      {qualityScore != null && <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-muted-foreground" /><QualityBadge score={qualityScore} /></span>}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {d.share_token && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/shared/${d.share_token}`)} className="text-[10px] h-7 px-2 gap-1">
                            <ExternalLink className="w-3 h-3" /> {t('dashboards.open')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} disabled={deleting === d.id} className="text-[10px] h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                          {deleting === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
