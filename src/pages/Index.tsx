import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Beaker, BarChart3, History, Mic, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/authContext';
import { Loader2 } from 'lucide-react';
import ThemeToggle from '@/components/dashboard/ThemeToggle';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Intelligence Studio — Data Analytics Platform'; }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  if (authLoading) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!user) return null;

  const modules = [
    {
      title: 'Data Cleaning Center',
      description: 'Upload, profile, clean, and export datasets with automated quality analysis',
      icon: Beaker,
      path: '/cleaning',
      gradient: 'from-primary to-accent',
      features: ['Auto data profiling', 'Outlier detection (IQR)', 'Quality Score 0–100', 'Export CSV/Excel/JSON'],
    },
    {
      title: 'Dashboard Studio',
      description: 'Auto-generate professional dashboards with KPIs, charts, and AI insights',
      icon: BarChart3,
      path: '/studio',
      gradient: 'from-accent to-primary',
      features: ['Auto-detect business context', '2D/3D/4D visualization', 'Executive reports', 'Export PDF/PNG/Code'],
    },
  ];

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-end gap-2 p-4">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => navigate('/dashboards')}>
          <History className="w-3.5 h-3.5" /> History
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => navigate('/aida')}>
          <Mic className="w-3.5 h-3.5" /> AIDA
        </Button>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            <span className="text-gradient">Intelligence</span>{' '}
            <span className="text-foreground">Studio</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Professional data analytics platform — clean, analyze, and visualize your data
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.path}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              onClick={() => navigate(mod.path)}
              className="glass-card p-6 cursor-pointer group hover:border-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center mb-4`}>
                <mod.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{mod.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{mod.description}</p>
              <ul className="space-y-1.5 mb-5">
                {mod.features.map(f => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                Open <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
