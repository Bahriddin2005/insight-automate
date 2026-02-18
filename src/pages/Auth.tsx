import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Loader2, Mail, Lock, User, Zap, BarChart3, Brain, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import LanguageToggle from '@/components/dashboard/LanguageToggle';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import { useEffect } from 'react';

export default function Auth() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    if (!authLoading && user) navigate('/');
  }, [authLoading, user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setSuccess(t('auth.signupSuccess'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  };

  const features = [
    { icon: BarChart3, label: t('auth.feature.autoDashboard'), desc: t('auth.feature.autoDashboardDesc') },
    { icon: Brain, label: t('auth.feature.aiAnalysis'), desc: t('auth.feature.aiAnalysisDesc') },
    { icon: ShieldCheck, label: t('auth.feature.dataCleaning'), desc: t('auth.feature.dataCleaningDesc') },
    { icon: Sparkles, label: t('auth.feature.visualization'), desc: t('auth.feature.visualizationDesc') },
  ];

  return (
    <div className="min-h-screen bg-mesh flex flex-col lg:flex-row">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      {/* Left side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-10 w-56 h-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
            <Zap className="w-3 h-3" />
            {t('auth.platformBadge')}
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gradient">{t('app.title.ai')}</span>{' '}
            <span className="text-foreground">{t('app.title.dashboard')}</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-10 max-w-md">
            {t('auth.platformDesc')}
          </p>

          <div className="space-y-5">
            {features.map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:py-0 relative">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <Zap className="w-3 h-3" />
            {t('auth.platformBadge')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            <span className="text-gradient">{t('app.title.ai')}</span>{' '}
            <span className="text-foreground">{t('app.title.dashboard')}</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="w-full max-w-md">
          <div className="glass-card p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-transparent -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isLogin ? t('auth.loginDesc') : t('auth.signupDesc')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative">
              {!isLogin && (
                <motion.div key="name-field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder={t('auth.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 bg-secondary/50 border-border/50 h-12 text-sm focus:border-primary/50 transition-colors" required />
                  </div>
                </motion.div>
              )}

              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-secondary/50 border-border/50 h-12 text-sm focus:border-primary/50 transition-colors" required />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-secondary/50 border-border/50 h-12 text-sm focus:border-primary/50 transition-colors" minLength={6} required />
              </div>

              {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">{error}</motion.p>}
              {success && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-accent text-sm bg-accent/10 px-3 py-2 rounded-lg border border-accent/20">{success}</motion.p>}

              <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold h-12 text-base glow-primary hover:opacity-90 transition-all">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? (
                  <><LogIn className="w-4 h-4 mr-2" /> {t('auth.login')}</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> {t('auth.signup')}</>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2 relative">
              {isLogin && (
                <button onClick={() => navigate('/forgot-password')} className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full">
                  {t('auth.forgotPassword')}
                </button>
              )}
              <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full">
                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
