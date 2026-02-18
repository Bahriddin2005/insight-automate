import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Beaker, BarChart3, History, Mic, LogOut } from 'lucide-react';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import LanguageToggle from '@/components/dashboard/LanguageToggle';
import { useAuth } from '@/lib/authContext';

const NAV_ITEMS = [
  { path: '/cleaning', label: 'Data Cleaning', icon: Beaker },
  { path: '/studio', label: 'Dashboard Studio', icon: BarChart3 },
  { path: '/dashboards', label: 'History', icon: History },
];

export default function PlatformNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-2">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground hidden sm:block">Intelligence Studio</span>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={active ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs gap-1.5 h-8 ${active ? '' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-8" onClick={() => navigate('/aida')}>
            <Mic className="w-3.5 h-3.5" /> <span className="hidden md:inline">AIDA</span>
          </Button>
          <ThemeToggle />
          <LanguageToggle />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={signOut}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
