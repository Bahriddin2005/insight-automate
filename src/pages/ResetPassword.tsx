import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18nContext';
import LanguageToggle from '@/components/dashboard/LanguageToggle';

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">{t('auth.resetPassword')}</p>
          <p className="text-sm text-muted-foreground mt-2">Invalid or expired reset link.</p>
          <Button variant="ghost" onClick={() => navigate('/auth')} className="mt-4">{t('auth.backToLogin')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">{t('auth.resetPassword')}</h2>
          {success ? (
            <p className="text-accent text-sm">{t('auth.passwordUpdated')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder={t('auth.newPassword')} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary border-border" minLength={6} required />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder={t('auth.confirmPassword')} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10 bg-secondary border-border" minLength={6} required />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold h-11 glow-primary hover:opacity-90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('auth.resetPassword')}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
