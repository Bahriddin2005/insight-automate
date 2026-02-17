import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';

interface Annotation {
  id: string;
  user_id: string;
  dashboard_id: string;
  chart_key: string;
  data_point_label: string;
  data_point_value: number | null;
  note: string;
  color: string;
  created_at: string;
  email?: string;
}

interface Props {
  dashboardId: string; // fileName or share token
  chartKey: string;
  dataPoints?: { label: string; value: number }[];
}

export default function ChartAnnotations({ dashboardId, chartKey, dataPoints }: Props) {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedPoint, setSelectedPoint] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAnnotations = useCallback(async () => {
    const { data } = await supabase
      .from('chart_annotations')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .eq('chart_key', chartKey)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setAnnotations(data as Annotation[]);
  }, [dashboardId, chartKey]);

  useEffect(() => {
    if (isOpen) fetchAnnotations();
  }, [isOpen, fetchAnnotations]);

  const addAnnotation = async () => {
    if (!newNote.trim() || !user) return;
    setLoading(true);
    const pointData = dataPoints?.find(p => p.label === selectedPoint);
    
    const { error } = await supabase.from('chart_annotations').insert([{
      user_id: user.id,
      dashboard_id: dashboardId,
      chart_key: chartKey,
      data_point_label: selectedPoint || 'general',
      data_point_value: pointData?.value ?? null,
      note: newNote.trim(),
      color: 'primary',
    }]);

    if (!error) {
      setNewNote('');
      setSelectedPoint('');
      fetchAnnotations();
    }
    setLoading(false);
  };

  const deleteAnnotation = async (id: string) => {
    await supabase.from('chart_annotations').delete().eq('id', id);
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const count = annotations.length;

  return (
    <div className="relative">
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-[10px] gap-1 h-6 px-2"
      >
        <StickyNote className="w-3 h-3" />
        {count > 0 && <span className="text-primary data-font">{count}</span>}
      </Button>

      {/* Annotation panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute right-0 top-full mt-1 w-72 sm:w-80 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <MessageSquarePlus className="w-3.5 h-3.5 text-primary" />
                Annotations
              </span>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6">
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Add new */}
            {user && (
              <div className="p-2 border-b border-border/30 space-y-1.5">
                {dataPoints && dataPoints.length > 0 && (
                  <select
                    value={selectedPoint}
                    onChange={e => setSelectedPoint(e.target.value)}
                    className="w-full text-[11px] bg-secondary text-secondary-foreground rounded-lg px-2 py-1 border border-border focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">General note</option>
                    {dataPoints.slice(0, 20).map(p => (
                      <option key={p.label} value={p.label}>{p.label}: {p.value.toLocaleString()}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-1">
                  <Input
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addAnnotation()}
                    placeholder="Add insight or note..."
                    className="h-7 text-[11px] flex-1"
                  />
                  <Button size="icon" onClick={addAnnotation} disabled={loading || !newNote.trim()} className="h-7 w-7 shrink-0">
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="max-h-48 overflow-y-auto">
              {annotations.length === 0 ? (
                <p className="text-center text-[11px] text-muted-foreground py-4">No annotations yet</p>
              ) : (
                annotations.map(ann => (
                  <div key={ann.id} className="px-3 py-2 border-b border-border/20 hover:bg-muted/30 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {ann.data_point_label !== 'general' && (
                          <span className="text-[9px] text-primary data-font block mb-0.5">
                            📌 {ann.data_point_label}{ann.data_point_value != null ? `: ${ann.data_point_value.toLocaleString()}` : ''}
                          </span>
                        )}
                        <p className="text-[11px] text-foreground/80 leading-relaxed">{ann.note}</p>
                        <span className="text-[9px] text-muted-foreground mt-0.5 block">
                          {new Date(ann.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {user?.id === ann.user_id && (
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => deleteAnnotation(ann.id)}
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
