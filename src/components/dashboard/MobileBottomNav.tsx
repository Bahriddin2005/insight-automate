import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Table2, Brain, Settings2, FileSearch } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'overview', icon: BarChart3, label: 'Overview' },
  { id: 'charts', icon: FileSearch, label: 'Charts' },
  { id: 'data', icon: Table2, label: 'Data' },
  { id: 'ai', icon: Brain, label: 'AI' },
  { id: 'settings', icon: Settings2, label: 'More' },
];

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const touchStartX = useRef(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swiping) return;
    setSwiping(false);
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) < 50) return;

    const currentIdx = TABS.findIndex(t => t.id === activeTab);
    if (diff < 0 && currentIdx < TABS.length - 1) {
      onTabChange(TABS[currentIdx + 1].id);
    } else if (diff > 0 && currentIdx > 0) {
      onTabChange(TABS[currentIdx - 1].id);
    }
  };

  return (
    <>
      {/* Swipe area overlay — only on mobile */}
      <div
        className="fixed inset-0 z-20 pointer-events-none md:hidden"
        style={{ pointerEvents: swiping ? 'auto' : 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/50 md:hidden safe-bottom"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-around h-14 px-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 h-0.5 w-8 bg-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
