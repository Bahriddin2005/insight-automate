import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, BarChart3, Clock, Mic, LogOut, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import LanguageToggle from '@/components/dashboard/LanguageToggle';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';

export default function PlatformNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { t } = useI18n();

  const navItems = [
    { path: '/cleaning', label: t('nav.dataCleaning'), icon: Sparkles },
    { path: '/studio', label: t('nav.dashboardStudio'), icon: BarChart3 },
    { path: '/dashboards', label: t('nav.history'), icon: Clock },
    
    { path: '/prodata', label: 'ProDataLab', icon: FlaskConical },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Brand */}
        <button
          onClick={() => navigate('/cleaning')}
          className="flex items-center gap-2 shrink-0 mr-2"
        >
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground hidden sm:inline">
            <span className="text-gradient">Intelligence</span> Studio
          </span>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/aida')} className="text-xs text-muted-foreground h-8 px-2">
            <Mic className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">AIDA</span>
          </Button>
          <ThemeToggle />
          <LanguageToggle />
          <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground h-8 px-2">
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
