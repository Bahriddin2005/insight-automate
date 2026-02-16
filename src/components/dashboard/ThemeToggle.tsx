import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !document.documentElement.classList.contains('light');
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium border border-border hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}
