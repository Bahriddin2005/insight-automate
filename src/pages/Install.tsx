import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Monitor, Apple, Globe, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18nContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');
    else setPlatform('desktop');

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const platforms = [
    { icon: Globe, label: 'Web (Browser)', desc: 'Use directly in your browser — no install needed', available: true },
    { icon: Smartphone, label: 'Android', desc: platform === 'android' && deferredPrompt ? 'Tap Install below' : 'Open in Chrome → Menu → Install App', available: true },
    { icon: Apple, label: 'iOS', desc: 'Open in Safari → Share → Add to Home Screen', available: true },
    { icon: Monitor, label: 'Windows / macOS', desc: platform === 'desktop' && deferredPrompt ? 'Click Install below' : 'Open in Chrome/Edge → Install icon in address bar', available: true },
  ];

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-6 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="text-gradient">Install</span>{' '}
          <span className="text-foreground">Analytics Studio</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Install the app on any device for the best experience — works offline too.
        </p>

        {isInstalled && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-4 mb-6 flex items-center gap-3 border-primary/30">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-foreground">App is already installed on this device!</p>
          </motion.div>
        )}

        <div className="space-y-3">
          {platforms.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <p.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {deferredPrompt && !isInstalled && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <Button onClick={handleInstall} className="w-full gradient-primary text-primary-foreground font-semibold h-12 text-base glow-primary">
              <Download className="w-5 h-5 mr-2" /> Install Now
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
