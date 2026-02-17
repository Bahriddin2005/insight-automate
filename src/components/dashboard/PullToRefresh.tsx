import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const delta = Math.max(0, e.touches[0].clientY - startY.current);
    // Dampen the pull
    setPullDistance(Math.min(delta * 0.5, 120));
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
        // Haptic feedback (Vibration API)
        if (navigator.vibrate) navigator.vibrate(50);
        toast({ title: '✓ Dashboard yangilandi', duration: 2000 });
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative md:hidden"
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center z-10 pointer-events-none transition-opacity"
        style={{
          top: -4,
          height: pullDistance,
          opacity: progress > 0.1 ? 1 : 0,
        }}
      >
        <div className="flex items-end pb-2">
          <motion.div
            animate={{ rotate: refreshing ? 360 : pullDistance >= THRESHOLD ? 180 : progress * 180 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0 }}
          >
            <RefreshCw className={`w-5 h-5 ${pullDistance >= THRESHOLD ? 'text-primary' : 'text-muted-foreground'}`} />
          </motion.div>
        </div>
      </div>

      {/* Content with pull transform */}
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pulling ? 'none' : 'transform 0.3s ease' }}>
        {children}
      </div>
    </div>
  );
}
