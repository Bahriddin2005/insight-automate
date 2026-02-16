import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, ExternalLink, Loader2, LayoutDashboard, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import LanguageToggle from '@/components/dashboard/LanguageToggle';

interface DashConfig {
  id: string;
  name: string;
  file_name: string | null;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
}

export default function MyDashboards() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<DashConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('dashboard_configs')
      .select('id, name, file_name, is_public, share_token, created_at')
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

  if (authLoading || !user) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0 h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">{t('dashboards.title')}</h1>
          </div>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : dashboards.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <LayoutDashboard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('dashboards.empty')}</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {dashboards.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground font-medium truncate">{d.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {d.file_name && <span className="truncate">{d.file_name}</span>}
                    <span className="flex items-center gap-1">
                      {d.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {d.is_public ? t('save.public') : t('save.private')}
                    </span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.share_token && (
                    <Button variant="outline" size="sm" onClick={() => navigate(`/shared/${d.share_token}`)} className="text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" /> {t('dashboards.open')}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} disabled={deleting === d.id} className="text-xs text-destructive hover:text-destructive">
                    {deleting === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
