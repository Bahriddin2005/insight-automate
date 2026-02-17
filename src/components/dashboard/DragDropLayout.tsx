import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Maximize2, Minimize2, LayoutGrid, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LayoutPanel {
  id: string;
  label: string;
  visible: boolean;
  size: 'normal' | 'wide';
  order: number;
}

interface Props {
  panels: LayoutPanel[];
  onLayoutChange: (panels: LayoutPanel[]) => void;
  children: (panelId: string) => React.ReactNode;
  hideLayoutEditor?: boolean;
}

export default function DragDropLayout({ panels, onLayoutChange, children, hideLayoutEditor = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sortedPanels = useMemo(() =>
    [...panels].sort((a, b) => a.order - b.order),
    [panels]
  );

  const visiblePanels = useMemo(() =>
    sortedPanels.filter(p => p.visible),
    [sortedPanels]
  );

  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    const updated = [...panels];
    const dragPanel = updated.find(p => p.id === dragId);
    const targetPanel = updated.find(p => p.id === targetId);
    if (dragPanel && targetPanel) {
      const tempOrder = dragPanel.order;
      dragPanel.order = targetPanel.order;
      targetPanel.order = tempOrder;
    }
    onLayoutChange(updated);
    setDragId(null);
    setDragOverId(null);
  }, [dragId, panels, onLayoutChange]);

  const toggleVisibility = useCallback((id: string) => {
    const updated = panels.map(p => p.id === id ? { ...p, visible: !p.visible } : p);
    onLayoutChange(updated);
  }, [panels, onLayoutChange]);

  const toggleSize = useCallback((id: string) => {
    const updated = panels.map(p => p.id === id ? { ...p, size: p.size === 'wide' ? 'normal' as const : 'wide' as const } : p);
    onLayoutChange(updated);
  }, [panels, onLayoutChange]);

  return (
    <div>
      {/* Layout editor toggle — yashiriladi vizual rejimda */}
      {!hideLayoutEditor && (
      <div className="flex items-center justify-end mb-3">
        <Button
          variant={editing ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEditing(!editing)}
          className="text-[10px] sm:text-xs h-7 sm:h-8 gap-1.5"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {editing ? 'Done' : 'Edit Layout'}
        </Button>
      </div>
      )}

      {/* Panel visibility controls when editing */}
      {!hideLayoutEditor && editing && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border/30 overflow-hidden"
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Toggle Panels & Drag to Reorder</p>
          <div className="flex flex-wrap gap-1.5">
            {sortedPanels.map(panel => (
              <button
                key={panel.id}
                onClick={() => toggleVisibility(panel.id)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                  panel.visible
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-secondary border-border/50 text-muted-foreground opacity-60'
                }`}
              >
                {panel.visible ? <Eye className="w-3 h-3 inline mr-1" /> : <EyeOff className="w-3 h-3 inline mr-1" />}
                {panel.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Rendered panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {visiblePanels.map(panel => (
          <div
            key={panel.id}
            className={`relative ${panel.size === 'wide' ? 'md:col-span-2' : ''} ${
              dragOverId === panel.id && editing ? 'ring-2 ring-primary/50 rounded-xl' : ''
            } ${dragId === panel.id ? 'opacity-50' : ''}`}
            draggable={editing}
            onDragStart={() => handleDragStart(panel.id)}
            onDragOver={(e) => handleDragOver(e, panel.id)}
            onDrop={() => handleDrop(panel.id)}
            onDragEnd={() => { setDragId(null); setDragOverId(null); }}
          >
            {editing && (
              <div className="absolute top-2 right-2 z-20 flex gap-1">
                <button
                  className="p-1 rounded bg-secondary/80 backdrop-blur-sm border border-border/50 hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => toggleSize(panel.id)}
                  className="p-1 rounded bg-secondary/80 backdrop-blur-sm border border-border/50 hover:bg-accent transition-colors"
                >
                  {panel.size === 'wide'
                    ? <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
                    : <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                </button>
              </div>
            )}
            {children(panel.id)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Vizual rejim — faqat KPI, grafiklar va statistika (shablon dashboarddan kelganda) */
export function getVisualPanels(): LayoutPanel[] {
  return [
    { id: 'kpi', label: 'KPI Cards', visible: true, size: 'wide', order: 0 },
    { id: 'statistics', label: 'Aniq statistika', visible: true, size: 'normal', order: 0.5 },
    { id: 'charts', label: 'Auto Charts', visible: true, size: 'wide', order: 1 },
    { id: 'insights', label: 'Insights', visible: true, size: 'wide', order: 2 },
  ];
}

// Default panel configuration
export function getDefaultPanels(): LayoutPanel[] {
  return [
    { id: 'kpi', label: 'KPI Cards', visible: true, size: 'wide', order: 0 },
    { id: 'intelligent-kpi', label: 'Smart KPIs', visible: true, size: 'wide', order: 1 },
    { id: 'anomaly', label: 'Anomaly Detection', visible: true, size: 'wide', order: 2 },
    { id: 'cleaning', label: 'Cleaning Report', visible: true, size: 'normal', order: 3 },
    { id: 'statistics', label: 'Aniq statistika', visible: true, size: 'normal', order: 3.5 },
    { id: 'schema', label: 'Schema Viewer', visible: true, size: 'normal', order: 4 },
    { id: 'insights', label: 'Insights', visible: true, size: 'wide', order: 5 },
    { id: 'charts', label: 'Auto Charts', visible: true, size: 'wide', order: 6 },
    { id: 'trend', label: 'Trend Comparison', visible: true, size: 'wide', order: 7 },
    { id: 'forecasting', label: 'Forecasting', visible: true, size: 'wide', order: 8 },
    { id: 'correlation', label: 'Correlation', visible: true, size: 'normal', order: 9 },
    { id: 'cohort', label: 'Cohort & Funnel', visible: true, size: 'wide', order: 10 },
    { id: 'churn', label: 'Churn Risk', visible: true, size: 'normal', order: 11 },
    { id: 'whatif', label: 'What-If', visible: true, size: 'normal', order: 12 },
    { id: 'comparison', label: 'Dataset Compare', visible: true, size: 'wide', order: 13 },
    { id: 'nl-query', label: 'NL Query', visible: true, size: 'wide', order: 14 },
    { id: 'report', label: 'Executive Report', visible: true, size: 'wide', order: 15 },
  ];
}
