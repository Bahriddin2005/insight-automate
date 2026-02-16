import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18nContext';
import LanguageToggle from '@/components/dashboard/LanguageToggle';

export default function ForgotPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('auth.resetPassword')}</h2>
          {sent ? (
            <div className="space-y-4">
              <p className="text-accent text-sm">{t('auth.resetSent')}</p>
              <Button variant="ghost" onClick={() => navigate('/auth')} className="text-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t('auth.backToLogin')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary border-border" required />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold h-11 glow-primary hover:opacity-90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('auth.sendReset')}
              </Button>
              <button type="button" onClick={() => navigate('/auth')} className="text-sm text-muted-foreground hover:text-primary transition-colors w-full text-center">
                {t('auth.backToLogin')}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
