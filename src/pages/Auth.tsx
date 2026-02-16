import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Loader2, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18nContext';
import LanguageToggle from '@/components/dashboard/LanguageToggle';

export default function Auth() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setSuccess(t('auth.signupSuccess'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          <span className="text-gradient">{t('app.title.ai')}</span>{' '}
          <span className="text-foreground">{t('app.title.dashboard')}</span>
        </h1>
        <p className="text-muted-foreground text-sm">{isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="w-full max-w-md">
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('auth.fullName')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary border-border"
                required
              />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-secondary border-border"
                minLength={6}
                required
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-accent text-sm">{success}</p>}

            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold h-11 glow-primary hover:opacity-90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isLogin ? (
                <><LogIn className="w-4 h-4 mr-2" /> {t('auth.login')}</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> {t('auth.signup')}</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
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
  );
}
