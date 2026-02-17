import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Image, FileText, Save, Share2 } from 'lucide-react';

interface MobileFABProps {
  onExportPNG: () => void;
  onExportPDF: () => void;
  onSave: () => void;
  onShare?: () => void;
}

const ACTIONS = [
  { id: 'png', icon: Image, label: 'PNG' },
  { id: 'pdf', icon: FileText, label: 'PDF' },
  { id: 'save', icon: Save, label: 'Saqlash' },
  { id: 'share', icon: Share2, label: 'Ulashish' },
] as const;

export default function MobileFAB({ onExportPNG, onExportPDF, onSave, onShare }: MobileFABProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (id: string) => {
    setOpen(false);
    if (id === 'png') onExportPNG();
    else if (id === 'pdf') onExportPDF();
    else if (id === 'save') onSave();
    else if (id === 'share') onShare?.();
  };

  const visibleActions = ACTIONS.filter(a => a.id !== 'share' || onShare);

  return (
    <div className="fixed right-4 bottom-20 z-30 md:hidden">
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-20"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="relative z-30">
        <AnimatePresence>
          {open && visibleActions.map((action, i) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: -(i + 1) * 56, scale: 1 }}
              exit={{ opacity: 0, y: 0, scale: 0.5 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              onClick={() => handleAction(action.id)}
              className="absolute bottom-0 right-0 flex items-center gap-2"
            >
              <span className="bg-card text-foreground text-xs font-medium px-2.5 py-1 rounded-lg border border-border/50 shadow-lg whitespace-nowrap">
                {action.label}
              </span>
              <div className="w-11 h-11 rounded-full bg-secondary border border-border/50 shadow-lg flex items-center justify-center text-foreground">
                <action.icon className="w-4.5 h-4.5" />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={() => setOpen(o => !o)}
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ duration: 0.25 }}
          className="w-12 h-12 rounded-full gradient-primary shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
