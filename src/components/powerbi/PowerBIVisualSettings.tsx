import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LayoutGrid, PieChart, TrendingUp, BarChart2, X } from 'lucide-react';
import type { PowerBiDataModel, PbiMeasure } from '@/lib/powerBiModel';
import PowerBISyncPanel from './PowerBISyncPanel';

interface Props {
  model: PowerBiDataModel;
  measures: PbiMeasure[];
  selectedVisual: string | null;
  config: Record<string, unknown>;
  onConfigChange: (c: Record<string, unknown>) => void;
  onSelectVisual?: (id: string | null) => void;
}

const VISUAL_LABELS: Record<string, string> = {
  trend: 'Performance Trend',
  'trend-detail': 'Operational Intelligence',
  bar: 'Category Breakdown',
  treemap: 'Regional Distribution',
  waterfall: 'Risk Variance',
  funnel: 'Growth Funnel',
  pie: 'Breakdown (Pie)',
};

export default function PowerBIVisualSettings({ model, measures, selectedVisual, onSelectVisual }: Props) {
  const [tab, setTab] = useState('format');

  const VisualIcon = selectedVisual === 'trend' ? TrendingUp : selectedVisual === 'bar' ? BarChart2 : selectedVisual === 'pie' ? PieChart : LayoutGrid;

  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] p-0.5 rounded">
          <TabsTrigger value="format" className="text-xs data-[state=active]:bg-[#111827] data-[state=active]:text-[#00D4FF] data-[state=active]:shadow-sm rounded">Format</TabsTrigger>
          <TabsTrigger value="sync" className="text-xs data-[state=active]:bg-[#111827] data-[state=active]:text-[#00D4FF] data-[state=active]:shadow-sm rounded">Sync</TabsTrigger>
        </TabsList>
        <TabsContent value="format" className="mt-4">
          <h2 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Visual Settings</h2>
          {selectedVisual ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 p-3 rounded bg-[#111827]/80 border border-[rgba(0,212,255,0.15)]">
                <div className="flex items-center gap-2 min-w-0">
                  <VisualIcon className="w-4 h-4 text-[#00D4FF] shrink-0" />
                  <span className="text-sm font-medium text-[#E5E7EB] truncate">{VISUAL_LABELS[selectedVisual] || selectedVisual}</span>
                </div>
                {onSelectVisual && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-[#9CA3AF] hover:text-[#E5E7EB]" onClick={() => onSelectVisual(null)} title="Deselect">
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-2 text-xs text-[#9CA3AF]">
                <p>• Number format, colors</p>
                <p>• Export DAX & M files from Export menu</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9CA3AF]">Click a visual to configure.</p>
          )}
        </TabsContent>
        <TabsContent value="sync" className="mt-4">
          <PowerBISyncPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
