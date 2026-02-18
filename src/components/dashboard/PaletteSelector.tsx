import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PALETTES: Record<string, { name: string; colors: string[] }> = {
  ggplot2: {
    name: 'ggplot2 Pastel',
    colors: [
      'hsl(160, 55%, 55%)', 'hsl(25, 75%, 65%)', 'hsl(230, 55%, 65%)',
      'hsl(300, 35%, 65%)', 'hsl(45, 75%, 60%)', 'hsl(190, 60%, 50%)',
    ],
  },
  viridis: {
    name: 'Viridis',
    colors: [
      'hsl(280, 70%, 30%)', 'hsl(230, 50%, 40%)', 'hsl(190, 60%, 42%)',
      'hsl(140, 60%, 45%)', 'hsl(80, 65%, 50%)', 'hsl(50, 85%, 55%)',
    ],
  },
  magma: {
    name: 'Magma',
    colors: [
      'hsl(280, 80%, 20%)', 'hsl(310, 60%, 35%)', 'hsl(340, 65%, 50%)',
      'hsl(15, 80%, 60%)', 'hsl(40, 90%, 65%)', 'hsl(55, 95%, 75%)',
    ],
  },
  ocean: {
    name: 'Ocean Breeze',
    colors: [
      'hsl(200, 70%, 30%)', 'hsl(195, 65%, 42%)', 'hsl(185, 60%, 50%)',
      'hsl(170, 55%, 55%)', 'hsl(155, 50%, 60%)', 'hsl(140, 45%, 65%)',
    ],
  },
  sunset: {
    name: 'Sunset Warm',
    colors: [
      'hsl(350, 70%, 45%)', 'hsl(15, 80%, 55%)', 'hsl(35, 85%, 58%)',
      'hsl(50, 80%, 60%)', 'hsl(65, 65%, 55%)', 'hsl(80, 50%, 50%)',
    ],
  },
  monochrome: {
    name: 'Monochrome',
    colors: [
      'hsl(220, 20%, 25%)', 'hsl(220, 18%, 38%)', 'hsl(220, 15%, 50%)',
      'hsl(220, 12%, 62%)', 'hsl(220, 10%, 74%)', 'hsl(220, 8%, 85%)',
    ],
  },
  colorblind: {
    name: 'Colorblind Safe',
    colors: [
      'hsl(210, 80%, 50%)', 'hsl(30, 90%, 55%)', 'hsl(0, 0%, 45%)',
      'hsl(50, 85%, 50%)', 'hsl(195, 70%, 45%)', 'hsl(340, 65%, 50%)',
    ],
  },
};

export type PaletteId = keyof typeof PALETTES;

interface PaletteSelectorProps {
  selected: PaletteId;
  onChange: (id: PaletteId) => void;
}

export default function PaletteSelector({ selected, onChange }: PaletteSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={() => setOpen(!open)}
      >
        <Palette className="w-3 h-3" />
        <div className="flex gap-0.5">
          {PALETTES[selected].colors.slice(0, 4).map((c, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[200px]"
          >
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-2 pb-1.5 mb-1 border-b border-border/50">
              Rang palitrasi
            </p>
            {Object.entries(PALETTES).map(([id, pal]) => (
              <button
                key={id}
                onClick={() => { onChange(id as PaletteId); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  selected === id
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <div className="flex gap-0.5 shrink-0">
                  {pal.colors.map((c, i) => (
                    <span key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                  ))}
                </div>
                <span className="truncate">{pal.name}</span>
                {selected === id && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
