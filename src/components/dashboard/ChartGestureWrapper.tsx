import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ChartGestureWrapperProps {
  charts: React.ReactNode[];
}

export default function ChartGestureWrapper({ charts }: ChartGestureWrapperProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scale, setScale] = useState(1);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);
  const touchStartDist = useRef(0);
  const initialScale = useRef(1);

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrentIdx(idx);
    setScale(1);
  }, []);

  const prev = () => {
    if (currentIdx > 0) goTo(currentIdx - 1, -1);
  };

  const next = () => {
    if (currentIdx < charts.length - 1) goTo(currentIdx + 1, 1);
  };

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      initialScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Pinch to zoom
    if (e.touches.length === 2 && touchStartDist.current > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(Math.max(initialScale.current * (dist / touchStartDist.current), 0.8), 3);
      setScale(newScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartDist.current > 0) {
      touchStartDist.current = 0;
      // Snap scale
      if (scale < 1) setScale(1);
      return;
    }
    // Swipe detection
    if (e.changedTouches.length === 1) {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(diff) > 60) {
        if (diff < 0) next();
        else prev();
      }
    }
  };

  const resetZoom = () => setScale(1);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  if (charts.length === 0) return null;

  return (
    <div className="md:hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <button onClick={prev} disabled={currentIdx === 0}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center disabled:opacity-30 text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground font-medium data-font">
            {currentIdx + 1} / {charts.length}
          </span>
          <button onClick={next} disabled={currentIdx === charts.length - 1}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center disabled:opacity-30 text-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {scale > 1 && (
            <button onClick={resetZoom} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setScale(s => Math.min(s + 0.5, 3))}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setScale(s => Math.max(s - 0.5, 0.8))}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart carousel */}
      <div
        className="overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={currentIdx}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          >
            {charts[currentIdx]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1 mt-3">
        {charts.map((_, i) => (
          <button key={i} onClick={() => goTo(i, i > currentIdx ? 1 : -1)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIdx ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
        ))}
      </div>
    </div>
  );
}
