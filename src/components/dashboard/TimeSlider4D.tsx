import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';

interface TimeSlider4DProps {
  dates: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

export default function TimeSlider4D({ dates, currentIndex, onIndexChange, isPlaying, onPlayToggle }: TimeSlider4DProps) {
  if (dates.length < 2) return null;

  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <div className="flex items-center gap-1 text-primary">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">4D</span>
      </div>

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onIndexChange(0)}>
        <SkipBack className="w-3.5 h-3.5" />
      </Button>

      <Button variant={isPlaying ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={onPlayToggle}>
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </Button>

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onIndexChange(dates.length - 1)}>
        <SkipForward className="w-3.5 h-3.5" />
      </Button>

      <div className="flex-1">
        <Slider
          value={[currentIndex]}
          min={0}
          max={dates.length - 1}
          step={1}
          onValueChange={([v]) => onIndexChange(v)}
        />
      </div>

      <span className="text-xs font-mono text-muted-foreground min-w-[80px] text-right">
        {dates[currentIndex] || '—'}
      </span>
    </div>
  );
}
