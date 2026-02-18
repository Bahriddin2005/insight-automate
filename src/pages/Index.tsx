import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/authContext';
import { Loader2 } from 'lucide-react';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import HeroModules from '@/components/home/HeroModules';

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

      <HeroModules />
    </div>
  );
};

export default Index;
